import { useState } from 'react';
import { priceLabel } from '../config';
import { Modal } from './Modal';

export interface PaidState {
  order: string;
  at: string;
}

interface Props {
  onClose: () => void;
  onPaid: (p: PaidState) => void;
  onDownload: () => void;
  paid: PaidState | null;
}

const METHODS = {
  upi: ['UPI ID', 'test@upi'],
  card: ['Card number', '4111 1111 1111 1111'],
  nb: ['Bank', 'Test Bank'],
} as const;

/** Test-mode checkout. Nothing is charged; the Razorpay flow replaces this. */
export function Checkout({ onClose, onPaid, onDownload, paid }: Props) {
  const [method, setMethod] = useState<keyof typeof METHODS>('upi');
  const [busy, setBusy] = useState(false);

  if (paid) {
    return (
      <Modal onClose={onClose} labelledBy="mt">
        <div className="mb">
          <div className="success">
            <div className="big">✓</div>
            <h3 id="mt">Payment successful</h3>
            <p>
              {priceLabel} test payment · <span className="mono">{paid.order}</span>
            </p>
          </div>
          <button className="btn primary wide" type="button" onClick={onDownload}>
            Download PDF
          </button>
          <button className="btn ghost small" type="button" onClick={onClose}>
            Keep editing
          </button>
        </div>
      </Modal>
    );
  }

  const pay = () => {
    setBusy(true);
    setTimeout(() => {
      onPaid({ order: 'order_TEST' + Math.random().toString(36).slice(2, 10).toUpperCase(), at: new Date().toISOString() });
      setBusy(false);
    }, 900);
  };

  return (
    <Modal onClose={onClose} labelledBy="mt">
      <div className="mh">
        <div style={{ flex: 1 }}>
          <h3 id="mt">Unlock your PDF</h3>
          <p>One-time payment. No subscription, no auto-renewal.</p>
        </div>
        <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="mb">
        <div className="amount">
          <span>wemakesucess PDF pass</span>
          <b>{priceLabel}</b>
        </div>
        <ul className="perks">
          <li>Unlimited PDF downloads of this resume</li>
          <li>Switch templates and re-download any time</li>
          <li>Text-based PDF that ATS can read</li>
        </ul>
        <div className="field">
          <span className="label">Pay with</span>
          <div className="seg">
            {(Object.keys(METHODS) as (keyof typeof METHODS)[]).map((m) => (
              <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)}>
                {{ upi: 'UPI', card: 'Card', nb: 'Netbanking' }[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="payField">{METHODS[method][0]}</label>
          <input id="payField" key={method} defaultValue={METHODS[method][1]} />
        </div>
        <div className="testband">
          <b>Test mode.</b> Nothing is charged. In the live app this step opens Razorpay checkout and the server verifies
          the payment before unlocking.
        </div>
        <button className="btn primary wide" type="button" disabled={busy} onClick={pay}>
          {busy ? 'Processing…' : `Pay ${priceLabel}`}
        </button>
      </div>
    </Modal>
  );
}
