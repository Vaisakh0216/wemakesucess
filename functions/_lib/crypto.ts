const enc = new TextEncoder();

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Razorpay checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  return safeEqual(await hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
}

/**
 * Unlock token: proves the resume `rid` was paid for in order `oid`.
 * Format: base64url(JSON payload) + "." + hex HMAC. Stateless; Razorpay holds the purchase record.
 */
export interface UnlockPayload {
  rid: string;
  oid: string;
  iat: number;
}

const b64u = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export async function signUnlock(p: UnlockPayload, secret: string): Promise<string> {
  const body = b64u(JSON.stringify(p));
  return `${body}.${await hmacHex(secret, 'unlock.v1.' + body)}`;
}

export async function verifyUnlock(token: unknown, secret: string): Promise<UnlockPayload | null> {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (!safeEqual(await hmacHex(secret, 'unlock.v1.' + body), sig)) return null;
  try {
    const p = JSON.parse(unb64u(body));
    return typeof p?.rid === 'string' && typeof p?.oid === 'string' ? p : null;
  } catch {
    return null;
  }
}
