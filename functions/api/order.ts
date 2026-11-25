import { CURRENCY, fail, json, paymentsConfigured, PRICE_PAISE, readJson, RID, type Env } from '../_lib/env';
import { createOrder } from '../_lib/razorpay';

/**
 * Create a ₹299 Razorpay order for one resume. The resume id goes into the order
 * notes, so the order itself is the purchase record.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
};
