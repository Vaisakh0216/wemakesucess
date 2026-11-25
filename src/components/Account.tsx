import { useEffect, useRef, useState } from 'react';
import { signOut, useAuth } from '../cloud';
import { Link } from '../router';

/** "Sign in" link, or the account menu when signed in. Hidden when sign-in is off. */
export function AccountButton() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (auth.status === 'off' || auth.status === 'loading') return null;
  if (auth.status === 'out' || !auth.user)
    return (
      <Link href="/login" className="btn">
        Sign in
      </Link>
    );

  const u = auth.user;
  const initial = (u.name || u.email || '?').trim()[0]?.toUpperCase();
  return (
    <div className="account" ref={root}>
      <button
        type="button"
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${u.email}`}
        onClick={() => setOpen(!open)}
      >
        {initial}
        {auth.sync !== 'idle' && <span className={'sync-dot ' + auth.sync} aria-hidden="true" />}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <p className="who">
            {u.name && u.name !== u.email && <b>{u.name}</b>}
            <span>{u.email}</span>
          </p>
          <p className={'sync-note ' + auth.sync}>
            {auth.sync === 'error'
              ? 'Could not reach your account. Changes are kept here and will sync when you are back online.'
              : auth.sync === 'syncing'
                ? 'Saving to your account…'
                : 'Your documents are saved to your account.'}
          </p>
          <Link href="/app" role="menuitem" onClick={() => setOpen(false)}>
            My Documents
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await signOut();
                setOpen(false);
              } catch (e) {
                setErr(e instanceof Error ? e.message : 'Sign out failed.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
          {err && <p className="err">{err}</p>}
        </div>
      )}
    </div>
  );
}

/** Nudge on My Documents while signed out. */
export function SaveToAccountBanner() {
  const auth = useAuth();
  if (auth.status !== 'out') return null;
  return (
    <div className="save-banner">
      <p>
        <b>Your resumes are only in this browser.</b> Sign in to keep them in your account and open them on any device.
      </p>
      <Link href="/login" className="btn primary small">
        Sign in or create account
      </Link>
    </div>
  );
}
