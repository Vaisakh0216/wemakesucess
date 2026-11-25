import type { Env } from './env';

const API = 'https://api.razorpay.com/v1';

export interface RazorpayOrder {
  id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: 'created' | 'attempted' | 'paid';
  receipt: string | null;
  notes: Record<string, string> | [];
}

function auth(env: Env) {
  return 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
}

export async function createOrder(env: Env, body: { amount: number; currency: string; receipt: string; notes: Record<string, string> }) {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { authorization: auth(env), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as RazorpayOrder;
}

export async function fetchOrder(env: Env, orderId: string): Promise<RazorpayOrder | null> {
  const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}`, { headers: { authorization: auth(env) } });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Razorpay fetch order failed: ${res.status}`);
  return (await res.json()) as RazorpayOrder;
}

export const orderRid = (o: RazorpayOrder) => (Array.isArray(o.notes) ? undefined : o.notes?.rid);
