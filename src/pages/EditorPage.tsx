import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountButton } from '../components/Account';
import { AtsPanel, ScoreRing } from '../components/AtsPanel';
import { Checkout } from '../components/Checkout';
import { Editor, type StepId } from '../components/Editor';
import { DesignToolbar } from '../components/DesignToolbar';
import { Preview, type Issue } from '../components/Preview';
import { priceLabel } from '../config';
import { getDoc, saveDoc } from '../docs';
import { downloadPdf, fetchConfig, loadUnlock, payWithRazorpay, restorePurchase, saveUnlock, type ServerConfig, type Unlock } from '../payments';
import { Link } from '../router';
import { atsChecks, atsScore } from '../shared/ats';
import { plainText } from '../shared/render';
import { LIMITS, SAMPLE, type Layout } from '../shared/resume';
import { useResume } from '../useResume';


export function EditorPage({ docId }: { docId: string }) {
  const { resume, setPath, update, replace, undo, redo, canUndo, canRedo } = useResume(docId);
  const [title, setTitle] = useState(() => getDoc(docId)?.title ?? 'My Resume');
  const [step, setStep] = useState<StepId>('contact');
  const [atsOpen, setAtsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const rid = docId;
  const [unlock, setPaid] = useState<Unlock | null>(() => loadUnlock(rid));
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  // A demo-mode unlock stops counting once real payments are switched on.
  const paid = unlock && (!unlock.demo || cfg?.payments === false) ? unlock : null;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const say = useCallback((msg: string, ms = 2500) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const checks = useMemo(() => atsChecks(resume), [resume]);
  const pct = atsScore(checks);
  const issues = useMemo<Issue[]>(
    () => checks.filter((c) => !c.ok && c.section).map((c) => ({ section: c.section!, message: c.fix })),
    [checks],
  );
  // Page count as last measured by the preview, with the layout it was measured for,
  // so the fit loop never acts on a count from before its last change.
  const layoutKey = JSON.stringify(resume.layout);
  const [measured, setMeasured] = useState({ pages: 1, key: '' });
  const pages = measured.pages;
  // "Fit to 1 page": tighten one notch per render (spacing, then margins, then font
  // size) until the preview measures a single page or every setting is at its minimum.
  const [fitting, setFitting] = useState(false);
  useEffect(() => {
    if (!fitting || measured.key !== layoutKey) return;
    if (pages <= 1) {
      setFitting(false);
      say('Fits on one page');
      return;
    }
    const next = tighten(resume.layout);
    if (!next) {
      setFitting(false);
      say('Still more than one page at the tightest settings. Try shortening a few bullets.', 5000);
      return;
    }
    update((r) => void Object.assign(r.layout, next));
  }, [fitting, measured, layoutKey, pages, resume.layout, update, say]);

  useEffect(() => {
    fetchConfig().then(setCfg);
    if (new URLSearchParams(location.search).has('imported')) {
      history.replaceState(null, '', location.pathname);
      say('Imported. Check each section: automatic reading is never perfect.', 7000);
    }
  }, [say]);

  // Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z (or Ctrl+Y) for undo and redo, outside text fields
  // (inside a field the browser's own text undo applies).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable]')) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) (e.preventDefault(), undo());
      else if ((k === 'z' && e.shiftKey) || k === 'y') (e.preventDefault(), redo());
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const download = async (unlock = paid) => {
    if (!unlock || !cfg) return;
    setCheckoutOpen(false);
    say('Preparing your PDF…', 8000);
    try {
      const how = await downloadPdf(resume, unlock, cfg);
      say(how === 'file' ? 'PDF downloaded' : 'Choose “Save as PDF” in the print dialog.', 5000);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Download failed. Please try again.', 6000);
    }
  };

  const pay = async () => {
    if (!cfg) return;
    if (!cfg.payments) {
      // Demo mode: no gateway configured on this server; simulate a payment.
      await new Promise((r) => setTimeout(r, 700));
      const u: Unlock = { rid, orderId: 'order_DEMO' + Math.random().toString(36).slice(2, 10).toUpperCase(), demo: true };
      saveUnlock(u);
      setPaid(u);
      return;
    }
    const c = resume.contact;
    const u = await payWithRazorpay(rid, { name: c.name, email: c.email, contact: c.phone.replace(/[^\d+]/g, '') });
    if (u) setPaid(u);
  };

  const onDownload = () => (paid ? download() : setCheckoutOpen(true));

  const copyText = async () => {
    const t = plainText(resume);
    try {
      await navigator.clipboard.writeText(t);
      say('Copied as plain text, ready to paste into job portals');
    } catch {
      say('Copy was blocked by the browser. Select the text and copy it manually.');
    }
  };

  return (
    <>
      <header className="top">
        <Link href="/" className="brand" aria-label="wemakesucess home">
          <span className="mark" aria-hidden="true">
            w
          </span>
          <span className="brand-name">wemakesucess</span>
        </Link>
        <Link href="/app" className="btn ghost small">
          ← My Documents
        </Link>
        <input
          className="doc-title"
          aria-label="Document name"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveDoc(docId, { title: e.target.value || 'Untitled' });
          }}
        />
        <div className="history" role="group" aria-label="History">
          <button className="icon-btn" type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
            ↶
          </button>
          <button className="icon-btn" type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            ↷
          </button>
        </div>
        <span className="spacer" />
        <span className={'pill' + (paid ? ' paid' : '')}>{paid ? 'PDF unlocked' : 'Free preview'}</span>
        <button className="btn" type="button" onClick={copyText}>
          Copy plain text
        </button>
        <button className="btn primary" type="button" onClick={onDownload}>
          Download PDF{!paid && <span className="price">· {priceLabel}</span>}
        </button>
        <AccountButton />
      </header>

      <main className="work">
        <Editor
          resume={resume}
          step={step}
          onStep={(s) => {
            setStep(s);
            document.getElementById('form')?.scrollTo(0, 0);
          }}
          setPath={setPath}
          update={update}
          onReset={() => {
            replace(SAMPLE);
            say('Loaded the example resume. Undo to get yours back.');
          }}
          onDownload={onDownload}
          priceLabel={priceLabel}
        />
        <section className="stage" aria-label="Live preview">
          <DesignToolbar resume={resume} update={update} setPath={setPath} pages={pages} onFitOnePage={() => setFitting(true)}>
            <button className="score" type="button" aria-expanded={atsOpen} onClick={() => setAtsOpen((o) => !o)}>
              <ScoreRing pct={pct} />
              <span>ATS check</span>
            </button>
          </DesignToolbar>
          {atsOpen && <AtsPanel checks={checks} pct={pct} />}
          <Preview
            resume={resume}
            issues={issues}
            onPages={(n) => setMeasured({ pages: n, key: layoutKey })}
            onIssue={(sec) => {
              setStep(STEP_FOR[sec] ?? 'more');
              document.getElementById('form')?.scrollTo(0, 0);
            }}
          />
        </section>
      </main>

      {checkoutOpen && cfg && (
        <Checkout
          live={cfg.payments}
          testKeys={cfg.testMode}
          unlock={paid}
          onClose={() => setCheckoutOpen(false)}
          onPay={pay}
          onRestore={async (orderId) => setPaid(await restorePurchase(rid, orderId))}
          onDownload={() => download()}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

const STEP_FOR: Partial<Record<Issue['section'], StepId>> = {
  contact: 'contact',
  summary: 'summary',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  projects: 'extras',
};

const round = (v: number) => Math.round(v * 1000) / 1000;

/** One notch tighter, or null when everything is already at its minimum. */
export function tighten(l: Layout): Partial<Layout> | null {
  if (l.spacing > LIMITS.spacing[0]) return { spacing: round(Math.max(LIMITS.spacing[0], l.spacing - 0.1)) };
  if (l.margin > LIMITS.margin[0]) return { margin: Math.max(LIMITS.margin[0], l.margin - 2) };
  if (l.fontScale > LIMITS.fontScale[0]) return { fontScale: round(Math.max(LIMITS.fontScale[0], l.fontScale - 0.025)) };
  return null;
}
