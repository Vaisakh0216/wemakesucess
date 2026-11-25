/**
 * Platform-neutral API handlers (Web Request in, Response out).
 * Thin adapters in api/ (Vercel) and functions/api/ (Cloudflare Pages) call these.
 */
import { resumeDocument } from '../src/shared/document.js';
import { fileName } from '../src/shared/render.js';
import { normalizeResume } from '../src/shared/resume.js';
import { RESUME_CSS } from '../src/shared/resumeCss.js';
import { signUnlock, verifyRazorpaySignature, verifyUnlock } from './crypto.js';
import { CURRENCY, fail, json, paymentsConfigured, PRICE_PAISE, readJson, RID, type Env } from './env.js';
import { createOrder, fetchOrder, orderRid } from './razorpay.js';

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
    serverPdf,
  });
}

/**
 * Create a ₹299 Razorpay order for one resume. The resume id goes into the order
 * notes, so the order itself is the purchase record.
 */
export async function handleOrder(request: Request, env: Env): Promise<Response> {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  const body = await readJson(request, 2_000);
  const rid = body?.rid;
  if (typeof rid !== 'string' || !RID.test(rid)) return fail(400, 'bad_resume_id');
  try {
    const order = await createOrder(env, {
      amount: PRICE_PAISE,
      currency: CURRENCY,
      receipt: `r_${rid.slice(0, 8)}_${Date.now().toString(36)}`,
      notes: { rid, product: 'pdf_unlock_one_resume' },
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
  if (!order || orderRid(order) !== rid || order.amount !== PRICE_PAISE) return fail(400, 'order_mismatch');

  const token = await signUnlock({ rid, oid: orderId, iat: now() }, env.UNLOCK_SECRET!);
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
  if (!order || order.status !== 'paid' || order.amount_paid < PRICE_PAISE) return fail(404, 'not_paid');
  if (orderRid(order) !== rid) return fail(403, 'different_resume');

  const token = await signUnlock({ rid, oid: orderId, iat: now() }, env.UNLOCK_SECRET!);
  return json({ token, orderId });
}

/**
 * Render the paid resume to a text-based PDF from the same HTML and CSS as the
 * live preview. Requires an unlock token for this resume id.
 */
export async function handlePdf(request: Request, env: Env, render: PdfRenderer | null): Promise<Response> {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  if (!render) return fail(501, 'server_pdf_unavailable');
  const b = await readJson(request, 64_000);
  const unlock = await verifyUnlock(b?.token, env.UNLOCK_SECRET!);
  if (!unlock || unlock.rid !== b?.rid) return fail(402, 'payment_required');

  const resume = normalizeResume(b?.resume);
  const pdf = await render(resumeDocument(resume, RESUME_CSS, new URL(request.url).origin));
  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${fileName(resume)}"`,
      'cache-control': 'no-store',
    },
  });
}
