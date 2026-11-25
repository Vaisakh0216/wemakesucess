import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtsPanel, ScoreRing } from './components/AtsPanel';
import { Checkout } from './components/Checkout';
import { Editor, type StepId } from './components/Editor';
import { Preview } from './components/Preview';
import { priceLabel } from './config';
import { downloadPdf, fetchConfig, loadUnlock, payWithRazorpay, restorePurchase, resumeId, saveUnlock, type ServerConfig, type Unlock } from './payments';
import { atsChecks, atsScore } from './shared/ats';
import { plainText } from './shared/render';
import { useResume } from './useResume';


export default function App() {
  const { resume, setPath, update, reset } = useResume();
  const [step, setStep] = useState<StepId>('contact');
  const [atsOpen, setAtsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [rid] = useState(resumeId);
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

  useEffect(() => {
    fetchConfig().then(setCfg);
  }, []);

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
        <div className="brand">
          <span className="mark" aria-hidden="true">
            w
          </span>
          wemakesucess <small>ATS resume builder</small>
        </div>
        <span className="spacer" />
        <span className={'pill' + (paid ? ' paid' : '')}>{paid ? 'PDF unlocked' : 'Free preview'}</span>
        <button className="btn" type="button" onClick={copyText}>
          Copy plain text
        </button>
        <button className="btn primary" type="button" onClick={onDownload}>
          Download PDF{!paid && <span className="price">· {priceLabel}</span>}
        </button>
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
            reset();
            say('Loaded the example resume');
          }}
          onDownload={onDownload}
          priceLabel={priceLabel}
        />
        <section className="stage" aria-label="Live preview">
          <div className="stagebar">
            <span className="label">Live preview · A4</span>
            <span className="spacer" />
            <button className="score" type="button" aria-expanded={atsOpen} onClick={() => setAtsOpen((o) => !o)}>
              <ScoreRing pct={pct} />
              <span>ATS check</span>
            </button>
          </div>
          {atsOpen && <AtsPanel checks={checks} pct={pct} />}
          <Preview resume={resume} />
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
