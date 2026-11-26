import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountButton } from '../components/Account';
import { AiAssist } from '../components/AiAssist';
import { Checkout } from '../components/Checkout';
import { Field } from '../components/Field';
import { Preview } from '../components/Preview';
import { Thumb } from '../components/Thumb';
import { coverPriceLabel } from '../config';
import { getCover, getResume, saveDoc } from '../docs';
import { claimUpi, downloadPdf, fetchConfig, isPaid, loadUnlock, payWithRazorpay, restorePurchase, saveUnlock, type ServerConfig, type Unlock } from '../payments';
import { Link } from '../router';
import { coverPlainText, todayIN } from '../shared/cover';
import { csv, lines } from '../shared/text';
import { ACCENTS, FONTS, TEMPLATES } from '../shared/resume';
import { useCover } from '../useResume';

/** Cover letter editor: same designs as the resume, ₹99 per letter to download. */
export function CoverEditorPage({ docId }: { docId: string }) {
  const { cover: c, setPath, update, undo, redo, canUndo, canRedo } = useCover(docId);
  const [title, setTitle] = useState(() => getCover(docId)?.title ?? 'Cover Letter');
  const [jd, setJd] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [unlock, setPaid] = useState<Unlock | null>(() => loadUnlock(docId));
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  const paid = isPaid(unlock, cfg);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const say = useCallback((msg: string, ms = 2500) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    fetchConfig().then(setCfg);
    document.title = 'Cover letter · wemakesucess';
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]') || !(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) (e.preventDefault(), undo());
      else if ((k === 'z' && e.shiftKey) || k === 'y') (e.preventDefault(), redo());
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const f = (path: string, label: string, opts: Partial<Parameters<typeof Field>[0]> = {}) => {
    const value = path.split('.').reduce<any>((o, k) => o?.[k], c) ?? '';
    return <Field key={path} label={label} value={value} onChange={(v) => setPath(path, v)} {...opts} />;
  };

  const download = async (u = paid) => {
    if (!u || !cfg) return;
    setCheckoutOpen(false);
    say('Preparing your PDF…', 8000);
    try {
      const how = await downloadPdf({ kind: 'cover', cover: c }, u, cfg);
      say(how === 'file' ? 'PDF downloaded' : 'Choose “Save as PDF” in the print dialog.', 5000);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Download failed. Please try again.', 6000);
    }
  };

  const pay = async () => {
    if (!cfg) return;
    if (!cfg.payments) {
      await new Promise((r) => setTimeout(r, 700));
      const u: Unlock = { rid: docId, orderId: 'order_DEMO' + Math.random().toString(36).slice(2, 10).toUpperCase(), demo: true };
      saveUnlock(u);
      setPaid(u);
      return;
    }
    const u = await payWithRazorpay(docId, { name: c.contact.name, email: c.contact.email, contact: c.contact.phone.replace(/[^\d+]/g, '') }, 'cover');
    if (u) setPaid(u);
  };

  // What the AI draft works from: the linked resume, the job and the letter so far.
  const aiContext = () => {
    const r = c.resumeId ? getResume(c.resumeId)?.data : null;
    const background = r
      ? [
          r.summary,
          ...r.experience.slice(0, 3).map((e) => `${e.role} at ${e.company}: ${lines(e.bullets).slice(0, 4).join('; ')}`),
          r.education[0] ? `${r.education[0].degree}, ${r.education[0].school}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '';
    return {
      title: c.contact.title,
      role: c.subject,
      company: c.recipient.company,
      skills: r ? csv(r.skills).slice(0, 20).join(', ') : '',
      background,
      jd,
      text: c.body,
    };
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
        <Link href="/app?tab=cover" className="btn ghost small">
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
        <button
          className="btn"
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(coverPlainText(c));
              say('Copied as plain text, ready to paste into an email or job portal');
            } catch {
              say('Copy was blocked by the browser.');
            }
          }}
        >
          Copy plain text
        </button>
        <button className="btn primary" type="button" onClick={() => (paid ? download() : setCheckoutOpen(true))}>
          Download PDF{!paid && <span className="price">· {coverPriceLabel}</span>}
        </button>
        <AccountButton />
      </header>

      <main className="work">
        <section className="editor" aria-label="Cover letter">
          <div className="form" id="form">
            <h2>Job you are applying for</h2>
            <div className="grid2">
              {f('subject', 'Job title (Re: line)', { placeholder: 'e.g. Data Analyst, ref. DA-2291' })}
              {f('recipient.company', 'Company')}
              {f('recipient.name', 'Hiring manager’s name', { placeholder: 'If you know it' })}
              {f('recipient.title', 'Their title', { placeholder: 'e.g. Talent Acquisition Lead' })}
              {f('recipient.address', 'Company address', { area: true, rows: 2, span: true })}
            </div>
            <div className="field">
              <label htmlFor="jd">Job description (optional, only used for the AI draft)</label>
              <textarea id="jd" rows={4} value={jd} placeholder="Paste the job posting here" onChange={(e) => setJd(e.target.value)} />
            </div>

            <h2>Letter</h2>
            <div className="grid2">
              {f('date', 'Date')}
              {f('greeting', 'Greeting')}
            </div>
            <button
              type="button"
              className="btn ghost small"
              style={{ alignSelf: 'flex-start', marginTop: -8 }}
              onClick={() => setPath('date', todayIN())}
            >
              Use today’s date
            </button>
            {f('body', 'Body (leave a blank line between paragraphs)', { area: true, rows: 14 })}
            <div className="ai-row">
              <AiAssist kind="cover" label="Write it with AI" context={aiContext} pickLabel="Use this" onPick={(s) => setPath('body', s)} />
              {c.body.trim() && (
                <AiAssist
                  kind="improve"
                  label="Improve my letter"
                  context={() => ({ ...aiContext(), text: c.body })}
                  pickLabel="Use this"
                  onPick={(s) => setPath('body', s)}
                />
              )}
            </div>
            <div className="grid2">
              {f('closing', 'Closing')}
              {f('signature', 'Signature')}
            </div>

            <h2>Your details</h2>
            <p className="hint">Shown at the top, exactly like your resume.</p>
            <div className="grid2">
              {f('contact.name', 'Full name', { span: true })}
              {f('contact.title', 'Your job title', { span: true })}
              {f('contact.email', 'Email', { type: 'email' })}
              {f('contact.phone', 'Phone', { type: 'tel' })}
              {f('contact.location', 'City, State')}
              {f('contact.linkedin', 'LinkedIn')}
            </div>

            <h2>Design</h2>
            <div className="tpls">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tpl"
                  aria-pressed={c.template === t.id}
                  onClick={() =>
                    update((x) => {
                      x.template = t.id;
                      x.font = t.font;
                    })
                  }
                >
                  <Thumb id={t.id} accent={c.accent} />
                  <b>{t.name}</b>
                </button>
              ))}
            </div>
            <div className="field">
              <span className="label">Colour</span>
              <div className="swatches">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="sw"
                    aria-pressed={c.accent === a}
                    aria-label={`Colour ${a}`}
                    style={{ background: a }}
                    onClick={() => setPath('accent', a)}
                  />
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Font</span>
              <div className="seg">
                {FONTS.map((x) => (
                  <button key={x.id} type="button" aria-pressed={c.font === x.id} onClick={() => setPath('font', x.id)}>
                    {x.name}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn primary" type="button" style={{ alignSelf: 'flex-start' }} onClick={() => (paid ? download() : setCheckoutOpen(true))}>
              Download PDF{!paid && ` · ${coverPriceLabel}`}
            </button>
          </div>
        </section>
        <section className="stage" aria-label="Live preview">
          <div className="toolbar">
            <span className="pages">Cover letter · A4</span>
          </div>
          <Preview cover={c} />
        </section>
      </main>

      {checkoutOpen && cfg && (
        <Checkout
          product="cover"
          live={cfg.payments}
          testKeys={cfg.testMode}
          unlock={paid}
          onClose={() => setCheckoutOpen(false)}
          onPay={pay}
          onRestore={async (orderId) => setPaid(await restorePurchase(docId, orderId))}
          upi={cfg.payments ? null : cfg.upi}
          docId={docId}
          onUpiClaim={async (utr) => setPaid(await claimUpi(docId, utr, 'cover', { name: c.contact.name, email: c.contact.email }))}
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
