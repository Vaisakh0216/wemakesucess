import type { SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { clearLocalDocs, deletedIds, forgetDeleted, listDocs, mergeDocs, subscribeDocs, type Doc } from './docs';
import { clearUnlocks, fetchConfig, loadUnlock, saveUnlock, UNLOCK_EVENT, type Unlock } from './payments';

/**
 * Accounts (Supabase Auth: email link and Google) and sync of "My Documents".
 * Everything is optional: with no Supabase settings on the server, sign-in is
 * hidden and documents stay in this browser as before. The Supabase library is
 * only downloaded when sign-in is switched on.
 */

export interface Account {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  /** off: sign-in not configured. loading: checking the session. */
  status: 'off' | 'loading' | 'out' | 'in';
  user: Account | null;
  sync: 'idle' | 'syncing' | 'error';
}

let state: AuthState = { status: 'loading', user: null, sync: 'idle' };
const listeners = new Set<() => void>();
const set = (patch: Partial<AuthState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => state,
  );
}

let client: Promise<SupabaseClient | null> | null = null;

function getClient(): Promise<SupabaseClient | null> {
  return (client ??= fetchConfig().then(async (cfg) => {
    if (!cfg.auth) return null;
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(cfg.auth.url, cfg.auth.anonKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }));
}

const redirectTo = () => `${location.origin}/app`;

/** Start once at page load: restore the session and keep documents in sync. */
export async function initAuth() {
  const sb = await getClient().catch(() => null);
  if (!sb) return set({ status: 'off' });
  sb.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    const prev = state.user?.id;
    set({
      status: u ? 'in' : 'out',
      user: u
        ? {
            id: u.id,
            email: u.email ?? '',
            name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? ''),
          }
        : null,
    });
    // Supabase calls back inside its own lock; sync after it returns.
    if (u && u.id !== prev) setTimeout(() => void syncNow(), 0);
  });
  const { data } = await sb.auth.getSession();
  if (!data.session) set({ status: 'out' });

  let timer: number | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void pushChanges(), 1500);
  };
  subscribeDocs(later);
  addEventListener(UNLOCK_EVENT, later);
  addEventListener('online', later);
}

export async function signInWithEmail(email: string) {
  const sb = await getClient();
  if (!sb) throw new Error('Sign-in is not available yet.');
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle() {
  const sb = await getClient();
  if (!sb) throw new Error('Sign-in is not available yet.');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
  if (error) throw new Error(error.message);
}

/**
 * Save anything not yet in the account, then sign out and clear this browser's
 * copies, so the next person on a shared computer does not see them.
 */
export async function signOut() {
  const sb = await getClient();
  if (!sb) return;
  const ok = await pushChanges();
  if (!ok) throw new Error('Could not save your latest changes to your account. Check your connection and try again.');
  await sb.auth.signOut();
  pushed.clear();
  clearLocalDocs();
  clearUnlocks();
}

/* ---------- sync ---------- */

interface Row {
  id: string;
  title: string;
  tags: string[];
  data: unknown;
  unlock: Unlock | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** What was last written to the account for each document: updatedAt plus whether it carried a purchase. */
const pushed = new Map<string, string>();
const stamp = (d: Doc) => d.updatedAt + (paidUnlock(d.id) ? '+paid' : '');

/** Only real (server-signed) purchases go to the account; demo unlocks stay local. */
function paidUnlock(id: string): Unlock | null {
  const u = loadUnlock(id);
  return u?.token && !u.demo ? u : null;
}

const toRow = (d: Doc, userId: string) => ({
  user_id: userId,
  id: d.id,
  title: d.title,
  tags: d.tags,
  data: d.data,
  unlock: paidUnlock(d.id),
  created_at: d.createdAt,
  updated_at: d.updatedAt,
  deleted_at: null,
});

let running: Promise<boolean> | null = null;

/** Full two-way sync: pull the account's documents, merge, then push what is newer here. */
export function syncNow(): Promise<boolean> {
  return (running ??= (async () => {
    const sb = await getClient();
    const user = state.user;
    if (!sb || !user) return false;
    set({ sync: 'syncing' });
    try {
      const { data, error } = await sb
        .from('documents')
        .select('id,title,tags,data,unlock,created_at,updated_at,deleted_at')
        .returns<Row[]>();
      if (error) throw error;
      const rows = data ?? [];
      const live = rows.filter((r) => !r.deleted_at);
      mergeDocs(
        live.map((r) => ({ id: r.id, title: r.title, tags: r.tags, data: r.data, createdAt: r.created_at, updatedAt: r.updated_at })),
        rows.filter((r) => r.deleted_at).map((r) => r.id),
      );
      for (const r of live) if (r.unlock?.token && !paidUnlock(r.id)) saveUnlock({ ...r.unlock, rid: r.id });
      pushed.clear();
      for (const r of live) pushed.set(r.id, r.updated_at + (r.unlock?.token ? '+paid' : ''));
      set({ sync: 'idle' });
    } catch {
      set({ sync: 'error' });
      return false;
    } finally {
      running = null;
    }
    return pushChanges();
  })());
}

/** Write local changes and deletions to the account. Returns false if anything failed. */
async function pushChanges(): Promise<boolean> {
  const sb = await getClient();
  const user = state.user;
  if (!sb || !user) return true;
  const changed = listDocs().filter((d) => pushed.get(d.id) !== stamp(d));
  const gone = deletedIds();
  if (!changed.length && !gone.length) return true;
  set({ sync: 'syncing' });
  try {
    if (changed.length) {
      const { error } = await sb.from('documents').upsert(changed.map((d) => toRow(d, user.id)));
      if (error) throw error;
      changed.forEach((d) => pushed.set(d.id, stamp(d)));
    }
    if (gone.length) {
      const now = new Date().toISOString();
      const { error } = await sb.from('documents').update({ deleted_at: now, data: {}, unlock: null }).in('id', gone);
      if (error) throw error;
      forgetDeleted(gone);
      gone.forEach((id) => pushed.delete(id));
    }
    set({ sync: 'idle' });
    return true;
  } catch {
    set({ sync: 'error' });
    return false;
  }
}
