import type { Env } from '../server/env.js';

/** Vercel: settings come from Project → Settings → Environment Variables. */
export const env = (): Env => ({
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  UNLOCK_SECRET: process.env.UNLOCK_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT,
});
