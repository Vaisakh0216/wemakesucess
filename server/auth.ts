import type { Env } from './env.js';

export const authConfigured = (env: Env) => !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

export const bearer = (request: Request) => request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? null;

/** The signed-in Supabase user for an access token, or null if the token is missing or not valid. */
export async function supabaseUser(env: Env, token: string | null): Promise<{ id: string; email: string } | null> {
  if (!token || !authConfigured(env)) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY!, authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  const u = (await res.json().catch(() => null)) as { id?: unknown; email?: unknown } | null;
  return typeof u?.id === 'string' ? { id: u.id, email: typeof u.email === 'string' ? u.email : '' } : null;
}
