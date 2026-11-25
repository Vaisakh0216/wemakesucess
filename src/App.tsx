import { useCallback, useMemo, useRef, useState } from 'react';
import { AtsPanel, ScoreRing } from './components/AtsPanel';
import { Checkout, type PaidState } from './components/Checkout';
import { Editor, type StepId } from './components/Editor';
import { Preview } from './components/Preview';
import { priceLabel } from './config';
import { printResume } from './download';
import { atsChecks, atsScore } from './shared/ats';
import { plainText } from './shared/render';
import { useResume } from './useResume';

const PAID_KEY = 'wms.paid.v1';
const readPaid = (): PaidState | null => {
  try {
    return JSON.parse(localStorage.getItem(PAID_KEY) || 'null');
  } catch {
    return null;
  }
};

export default function App() {
  const { resume, setPath, update, reset } = useResume();
  const [step, setStep] = useState<StepId>('contact');
  const [atsOpen, setAtsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paid, setPaid] = useState<PaidState | null>(readPaid);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const say = useCallback((msg: string, ms = 2500) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const checks = useMemo(() => atsChecks(resume), [resume]);
  const pct = atsScore(checks);

  const download = () => {
    setCheckoutOpen(false);
    printResume(resume);
    say('Choose “Save as PDF” in the print dialog.', 5000);
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

      {checkoutOpen && (
        <Checkout
          paid={paid}
          onClose={() => setCheckoutOpen(false)}
          onDownload={download}
          onPaid={(p) => {
            setPaid(p);
            try {
              localStorage.setItem(PAID_KEY, JSON.stringify(p));
            } catch {
              /* ignore */
            }
          }}
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
