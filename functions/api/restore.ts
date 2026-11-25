import { signUnlock } from '../_lib/crypto';
import { fail, json, paymentsConfigured, PRICE_PAISE, readJson, RID, type Env } from '../_lib/env';
import { fetchOrder, orderRid } from '../_lib/razorpay';

/**
 * Re-issue an unlock token from a paid order id, e.g. when the tab closed before
 * verification finished. Razorpay is the source of truth.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  const b = await readJson(request, 2_000);
  const rid = typeof b?.rid === 'string' ? b.rid : '';
  const orderId = typeof b?.orderId === 'string' ? b.orderId.trim() : '';
  if (!RID.test(rid) || !/^order_[A-Za-z0-9]{6,40}$/.test(orderId)) return fail(400, 'bad_request');

  const order = await fetchOrder(env, orderId).catch(() => null);
  if (!order || order.status !== 'paid' || order.amount_paid < PRICE_PAISE) return fail(404, 'not_paid');
  if (orderRid(order) !== rid) return fail(403, 'different_resume');

  const token = await signUnlock({ rid, oid: orderId, iat: Math.floor(Date.now() / 1000) }, env.UNLOCK_SECRET!);
  return json({ token, orderId });
};
