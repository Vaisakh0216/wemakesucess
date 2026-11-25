import { aiConfigured } from './ai.js';
/**
 * Platform-neutral API handlers (Web Request in, Response out).
 * Thin adapters in api/ (Vercel) and functions/api/ (Cloudflare Pages) call these.
 */
import { coverFileName, normalizeCover } from '../src/shared/cover.js';
import { coverDocument, resumeDocument } from '../src/shared/document.js';
import { fileName } from '../src/shared/render.js';
import { normalizeResume } from '../src/shared/resume.js';
import { RESUME_CSS } from '../src/shared/resumeCss.js';
import { signUnlock, verifyRazorpaySignature, verifyUnlock } from './crypto.js';
import { CURRENCY, fail, json, paymentsConfigured, PRICE_PAISE, PRICES, product, readJson, RID, type Env, type Product } from './env.js';
import { createOrder, fetchOrder, orderProduct, orderRid } from './razorpay.js';

/** Turns a full HTML document into PDF bytes with headless Chrome. */
export type PdfRenderer = (html: string) => Promise<Uint8Array>;

/**
 * Page script for renderers: start loading the resume's font faces and wait for
 * them. Web fonts only load once text needs them, so without this the PDF can be
 * captured with fallback fonts.
 */
export const WAIT_FOR_FONTS = `(async () => {
  const el = document.querySelector('.r');
  if (!el) return;
  const fam = getComputedStyle(el).fontFamily;
  await Promise.all(['400', 'italic 400', '500', '600', '700'].map((w) => document.fonts.load(w + ' 12px ' + fam, 'Aa₹').catch(() => [])));
  await document.fonts.ready;
})()`;

const str = (v: unknown, max = 100) => (typeof v === 'string' && v.length <= max ? v : '');
const now = () => Math.floor(Date.now() / 1000);

/** Public config for the web app: whether payments and server PDFs are available. */
export function handleConfig(env: Env, serverPdf: boolean): Response {
  return json({
    payments: paymentsConfigured(env),
    testMode: !!env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'),
    amount: PRICE_PAISE,
    coverAmount: PRICES.cover,
    serverPdf,
    ai: aiConfigured(env),
    auth: env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? { url: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY } : null,
  });
}

const NOTE: Record<Product, string> = { resume: 'pdf_unlock_one_resume', cover: 'pdf_unlock_one_cover_letter' };
const tokenFor = (rid: string, oid: string, p: Product) =>
  ({ rid, oid, iat: now(), ...(p === 'cover' ? { p: 'cover' as const } : {}) });

/**
 * Create a Razorpay order for one document: ₹299 for a resume, ₹99 for a cover
 * letter. The document id and product go into the order notes, so the order
 * itself is the purchase record.
 */
export async function handleOrder(request: Request, env: Env): Promise<Response> {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  const body = await readJson(request, 2_000);
  const rid = body?.rid;
  if (typeof rid !== 'string' || !RID.test(rid)) return fail(400, 'bad_resume_id');
  const p = product(body?.product);
  try {
    const order = await createOrder(env, {
      amount: PRICES[p],
      currency: CURRENCY,
      receipt: `${p === 'cover' ? 'c' : 'r'}_${rid.slice(0, 8)}_${Date.now().toString(36)}`,
      notes: { rid, product: NOTE[p] },
    });
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error(e);
    return fail(502, 'gateway_error');
  }
}

/**
 * Called by the browser after Razorpay checkout succeeds. Verifies the payment
 * signature with the key secret, checks the order belongs to this resume, and
 * returns a signed unlock token. The browser never decides on its own that a payment happened.
 */
export async function handleVerify(request: Request, env: Env): Promise<Response> {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  const b = await readJson(request, 2_000);
  const rid = str(b?.rid);
  const orderId = str(b?.razorpay_order_id);
  const paymentId = str(b?.razorpay_payment_id);
  const signature = str(b?.razorpay_signature, 200);
  if (!RID.test(rid) || !orderId || !paymentId || !signature) return fail(400, 'bad_request');

  if (!(await verifyRazorpaySignature(orderId, paymentId, signature, env.RAZORPAY_KEY_SECRET!)))
    return fail(400, 'bad_signature');

  // The signature proves Razorpay issued this payment for this order; also check
  // the order was created for this resume at the full price.
  const order = await fetchOrder(env, orderId).catch(() => null);
  if (!order || orderRid(order) !== rid || order.amount !== PRICES[orderProduct(order)]) return fail(400, 'order_mismatch');

  const token = await signUnlock(tokenFor(rid, orderId, orderProduct(order)), env.UNLOCK_SECRET!);
  return json({ token, orderId });
}

/**
 * Re-issue an unlock token from a paid order id, e.g. when the tab closed before
 * verification finished, or on another device. Razorpay is the source of truth.
 */
export async function handleRestore(request: Request, env: Env): Promise<Response> {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  const b = await readJson(request, 2_000);
  const rid = typeof b?.rid === 'string' ? b.rid : '';
  const orderId = typeof b?.orderId === 'string' ? b.orderId.trim() : '';
  if (!RID.test(rid) || !/^order_[A-Za-z0-9]{6,40}$/.test(orderId)) return fail(400, 'bad_request');

  const order = await fetchOrder(env, orderId).catch(() => null);
  if (!order || order.status !== 'paid' || order.amount_paid < PRICES[orderProduct(order)]) return fail(404, 'not_paid');
  if (orderRid(order) !== rid) return fail(403, 'different_resume');

  const token = await signUnlock(tokenFor(rid, orderId, orderProduct(order)), env.UNLOCK_SECRET!);
  return json({ token, orderId });
}

/**
 * Render the paid resume to a text-based PDF from the same HTML and CSS as the
 * live preview. Requires an unlock token for this resume id.
 */
export async function handlePdf(request: Request, env: Env, render: PdfRenderer | null): Promise<Response> {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  if (!render) return fail(501, 'server_pdf_unavailable');
  // Room for a resume photo (up to ~200 KB as base64).
  const b = await readJson(request, 400_000);
  const unlock = await verifyUnlock(b?.token, env.UNLOCK_SECRET!);
  if (!unlock || unlock.rid !== b?.rid) return fail(402, 'payment_required');
  // A ₹99 cover letter token cannot download a resume, and the other way round.
  const kind = b?.kind === 'cover' ? 'cover' : 'resume';
  if ((unlock.p ?? 'resume') !== kind) return fail(402, 'payment_required');

  const origin = new URL(request.url).origin;
  let html: string;
  let name: string;
  if (kind === 'cover') {
    const c = normalizeCover(b?.cover);
    [html, name] = [coverDocument(c, RESUME_CSS, origin), coverFileName(c)];
  } else {
    const resume = normalizeResume(b?.resume);
    [html, name] = [resumeDocument(resume, RESUME_CSS, origin), fileName(resume)];
  }
  const pdf = await render(html);
  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    },
  });
}
