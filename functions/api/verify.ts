import { verifyRazorpaySignature, signUnlock } from '../_lib/crypto';
import { fail, json, paymentsConfigured, PRICE_PAISE, readJson, RID, type Env } from '../_lib/env';
import { fetchOrder, orderRid } from '../_lib/razorpay';

const str = (v: unknown, max = 100) => (typeof v === 'string' && v.length <= max ? v : '');

/**
 * Called by the browser after Razorpay checkout succeeds. Verifies the payment
 * signature with the key secret, checks the order belongs to this resume, and
 * returns a signed unlock token. The browser never decides on its own that a payment happened.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

  const token = await signUnlock({ rid, oid: orderId, iat: Math.floor(Date.now() / 1000) }, env.UNLOCK_SECRET!);
  return json({ token, orderId });
};
