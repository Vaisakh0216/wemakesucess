import type { Resume } from './shared/resume';
import { fileName } from './shared/render';
import { printResume } from './download';

export interface ServerConfig {
  payments: boolean;
  testMode: boolean;
  amount: number;
  serverPdf: boolean;
  /** Supabase settings when sign-in is switched on. */
  auth?: { url: string; anonKey: string } | null;
}

/** Saved proof of purchase for one resume. */
export interface Unlock {
  rid: string;
  orderId: string;
  /** Signed by the server. Absent for demo-mode unlocks. */
  token?: string;
  demo?: boolean;
}

const UNLOCKS_KEY = 'wms.unlocks.v1';
const LEGACY_UNLOCK_KEY = 'wms.unlock.v1';

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const put = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

/** Unlocks for every document in this browser, keyed by resume id. */
function allUnlocks(): Record<string, Unlock> {
  try {
    const map = JSON.parse(get(UNLOCKS_KEY) || '{}') as Record<string, Unlock>;
    const legacy = JSON.parse(get(LEGACY_UNLOCK_KEY) || 'null') as Unlock | null;
    if (legacy?.rid && !map[legacy.rid]) map[legacy.rid] = legacy;
    return map;
  } catch {
    return {};
  }
}

export const loadUnlock = (rid: string): Unlock | null => allUnlocks()[rid] ?? null;

export function saveUnlock(u: Unlock) {
  put(UNLOCKS_KEY, JSON.stringify({ ...allUnlocks(), [u.rid]: u }));
  if (typeof dispatchEvent === 'function') dispatchEvent(new Event(UNLOCK_EVENT));
}

/** Fired after a purchase is saved, so cloud sync can copy it to the account. */
export const UNLOCK_EVENT = 'wms:unlock';

export function clearUnlocks() {
  put(UNLOCKS_KEY, '{}');
  try {
    localStorage.removeItem(LEGACY_UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

let configPromise: Promise<ServerConfig> | null = null;

/** Server settings, fetched once per page load. */
export function fetchConfig(): Promise<ServerConfig> {
  return (configPromise ??= loadConfig());
}

async function loadConfig(): Promise<ServerConfig> {
  try {
    const res = await fetch('/api/config');
    if (res.ok && res.headers.get('content-type')?.includes('json')) return await res.json();
  } catch {
    /* static hosting or offline: fall through to demo mode */
  }
  return { payments: false, testMode: true, amount: 29900, serverPdf: false, auth: null };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

let razorpayScript: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  razorpayScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => {
      razorpayScript = null;
      reject(new Error('Could not load Razorpay. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return razorpayScript;
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, fn: (r: any) => void): void };
  }
}

/**
 * Real checkout: server creates the order, Razorpay collects the payment, server
 * verifies the signature and returns an unlock token.
 * Resolves null if the user closes the checkout.
 */
export async function payWithRazorpay(rid: string, prefill: { name?: string; email?: string; contact?: string }): Promise<Unlock | null> {
  const [order] = await Promise.all([
    post<{ orderId: string; amount: number; currency: string; keyId: string }>('/api/order', { rid }),
    loadRazorpay(),
  ]);
  const result = await new Promise<RazorpaySuccess | null>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'wemakesucess',
      description: 'PDF download: one resume, unlimited downloads',
      prefill,
      theme: { color: '#2747d0' },
      handler: (r: RazorpaySuccess) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'Payment failed')));
    rzp.open();
  });
  if (!result) return null;
  const { token, orderId } = await post<{ token: string; orderId: string }>('/api/verify', { rid, ...result });
  const u = { rid, orderId, token };
  saveUnlock(u);
  return u;
}

/** Recover an unlock from a paid Razorpay order id (shown on the receipt). */
export async function restorePurchase(rid: string, orderId: string): Promise<Unlock> {
  const { token } = await post<{ token: string }>('/api/restore', { rid, orderId });
  const u = { rid, orderId, token };
  saveUnlock(u);
  return u;
}

/**
 * Download the PDF. Uses the server renderer when available; otherwise (demo mode,
 * or Browser Rendering not set up yet) falls back to the browser's Save as PDF.
 * Returns 'file' or 'print' so the UI can explain what happens.
 */
export async function downloadPdf(r: Resume, unlock: Unlock, cfg: ServerConfig): Promise<'file' | 'print'> {
  if (cfg.payments && !unlock.token) throw new Error('Please complete the payment to download.');
  if (unlock.token && cfg.serverPdf) {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rid: unlock.rid, token: unlock.token, resume: r }),
    });
    if (res.ok) {
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName(r);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return 'file';
    }
    if (res.status === 402) throw new Error('This purchase could not be verified for this resume.');
  }
  printResume(r);
  return 'print';
}
