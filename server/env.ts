/** Server settings. Read from process.env on Vercel, from bindings on Cloudflare. */
export interface Env {
  /** Razorpay key id (public). Test keys start with rzp_test_. */
  RAZORPAY_KEY_ID?: string;
  /** Razorpay key secret. Set as an encrypted secret, never in code. */
  RAZORPAY_KEY_SECRET?: string;
  /** Random secret (32+ chars) used to sign unlock tokens. */
  UNLOCK_SECRET?: string;
  /** Supabase project URL, for sign-in and cloud sync (public). */
  SUPABASE_URL?: string;
  /** Supabase anon key (public; row-level security protects the data). */
  SUPABASE_ANON_KEY?: string;
  /** Claude API key for "Generate with AI". Secret. */
  ANTHROPIC_API_KEY?: string;
  /** Optional model override for AI writing help. */
  AI_MODEL?: string;
  /** AI generations per signed-in user per day (default 20). */
  AI_DAILY_LIMIT?: string;
}

/** ₹299 in paise. The server is the only source of truth for the price. */
export const PRICE_PAISE = 29900;
export const CURRENCY = 'INR';

export const paymentsConfigured = (env: Env) =>
  !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.UNLOCK_SECRET);

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const fail = (status: number, error: string) => json({ error }, status);

/** Resume ids are client-generated UUIDs. */
export const RID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readJson(request: Request, maxBytes = 64_000): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}
