import { useEffect, useState } from 'react';
import { refFor, upiLink, UTR } from '../shared/upi';

/** QR code as an SVG path: dark modules on a white square with a quiet zone, so any phone camera reads it in either theme. */
function useQrPath(text: string) {
  const [qr, setQr] = useState<{ d: string; n: number } | null>(null);
  useEffect(() => {
    let live = true;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const q = qrcode(0, 'M');
      q.addData(text);
      q.make();
      const n = q.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
      if (live) setQr({ d, n: n + 8 });
    });
    return () => void (live = false);
  }, [text]);
  return qr;
}

interface Props {
  upi: { id: string; name: string };
  rupees: number;
  docId: string;
  thing: string;
  busy: boolean;
  onClaim: (utr: string) => void;
}

/** Pay by scanning a UPI QR code (or tapping through on a phone), then enter the UPI reference to unlock. */
export function UpiPay({ upi, rupees, docId, thing, busy, onClaim }: Props) {
  const ref = refFor(docId);
  const link = upiLink({ id: upi.id, name: upi.name, rupees, note: `${ref} ${thing}` });
  const qr = useQrPath(link);
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const clean = utr.replace(/\s+/g, '');
  const valid = UTR.test(clean);
  const mobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upi.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the id is on screen to copy by hand */
    }
  };

  return (
    <div className="upi">
      <div className="upi-qr">
        {qr ? (
          <svg viewBox={`0 0 ${qr.n} ${qr.n}`} role="img" aria-label={`UPI QR code to pay ₹${rupees} to ${upi.id}`} shapeRendering="crispEdges">
            <rect width={qr.n} height={qr.n} fill="#fff" />
            <path d={qr.d} fill="#000" />
          </svg>
        ) : (
          <span className="muted">Loading QR…</span>
        )}
      </div>
      <p className="upi-how">
        Scan with GPay, PhonePe, Paytm or any UPI app. The amount <b>₹{rupees}</b> is filled in for you.
      </p>
      {mobile && (
        <a className="btn wide" href={link}>
          Open my UPI app
        </a>
      )}
      <div className="upi-id">
        <span>
          <small>Or pay to UPI ID</small>
          <span className="mono">{upi.id}</span>
        </span>
        <button type="button" className="btn small" onClick={copy}>
          {copied ? 'Copied' : 'Copy UPI ID'}
        </button>
      </div>
      <p className="fine" style={{ textAlign: 'left', margin: 0 }}>
        If you pay by UPI ID, add <span className="mono">{ref}</span> in the note.
      </p>
      <form
        className="restore"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onClaim(clean);
        }}
      >
        <div className="field">
          <label htmlFor="utr">After paying, enter the 12-digit UPI reference (UTR)</label>
          <input
            id="utr"
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            value={utr}
            placeholder="e.g. 433512345678"
            onChange={(e) => setUtr(e.target.value.replace(/[^\d\s]/g, ''))}
          />
        </div>
        <button className="btn primary" type="submit" disabled={busy || !valid}>
          {busy ? 'Please wait…' : 'Unlock PDF'}
        </button>
      </form>
      <p className="fine" style={{ textAlign: 'left', margin: 0 }}>
        Find it in your UPI app under the payment's details, as "UPI Ref No.", "UTR" or "UPI transaction ID".
      </p>
    </div>
  );
}
