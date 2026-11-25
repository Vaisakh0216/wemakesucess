import { useState } from 'react';
import { priceLabel } from '../config';
import type { Unlock } from '../payments';
import { Modal } from './Modal';

interface Props {
  /** Real Razorpay checkout is configured on the server. */
  live: boolean;
  /** Razorpay test keys (no real money). */
  testKeys: boolean;
  unlock: Unlock | null;
  onClose: () => void;
  onPay: () => Promise<void>;
  onRestore: (orderId: string) => Promise<void>;
  onDownload: () => void;
}

export function Checkout({ live, testKeys, unlock, onClose, onPay, onRestore, onDownload }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [orderId, setOrderId] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (unlock) {
    return (
      <Modal onClose={onClose} labelledBy="mt">
        <div className="mb">
          <div className="success">
            <div className="big">✓</div>
            <h3 id="mt">{unlock.demo ? 'Demo payment complete' : 'Payment successful'}</h3>
            <p>
              Order <span className="mono">{unlock.orderId}</span>. Keep this id to restore your purchase.
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
          <li>Unlimited PDF downloads of this resume, forever</li>
          <li>Edit and switch templates, then re-download free</li>
          <li>Text-based PDF that ATS can read</li>
          <li>Pay by UPI, card, netbanking or wallet</li>
        </ul>
        {!live && (
          <div className="testband">
            <b>Demo mode.</b> Payments are not set up on this server yet, so nothing is charged.
          </div>
        )}
        {live && testKeys && (
          <div className="testband">
            <b>Razorpay test mode.</b> Use Razorpay's test UPI ID <span className="mono">success@razorpay</span> or a
            test card. No real money moves.
          </div>
        )}
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary wide" type="button" disabled={busy} onClick={() => run(onPay)}>
          {busy ? 'Please wait…' : `Pay ${priceLabel}`}
        </button>
        {live &&
          (restoring ? (
            <form
              className="restore"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => onRestore(orderId.trim()));
              }}
            >
              <div className="field">
                <label htmlFor="orderId">Razorpay order id from your receipt</label>
                <input id="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="order_…" />
              </div>
              <button className="btn" type="submit" disabled={busy || !orderId.trim()}>
                Restore
              </button>
            </form>
          ) : (
            <button className="btn ghost small" type="button" onClick={() => setRestoring(true)}>
              Already paid for this resume? Restore your purchase
            </button>
          ))}
      </div>
    </Modal>
  );
}
