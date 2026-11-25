import { paymentsConfigured, json, PRICE_PAISE, type Env } from '../_lib/env';

/** Public config for the web app: whether payments and server PDFs are available. */
export const onRequestGet: PagesFunction<Env> = ({ env }) =>
  json({
    payments: paymentsConfigured(env),
    testMode: !!env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'),
    amount: PRICE_PAISE,
    serverPdf: !!env.BROWSER,
  });
