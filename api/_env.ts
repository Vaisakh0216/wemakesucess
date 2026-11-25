import type { Env } from '../server/env.js';

/** Vercel: settings come from Project → Settings → Environment Variables. */
export const env = (): Env => ({
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  UNLOCK_SECRET: process.env.UNLOCK_SECRET,
});
