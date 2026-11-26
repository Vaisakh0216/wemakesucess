import { useEffect, useState } from 'react';
import { signInWithEmail, signInWithGoogle, useAuth } from '../cloud';
import { GoogleLogo } from '../components/SignInGate';
import { Link, navigate } from '../router';

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Sign in · wemakesucess';
  }, []);
  useEffect(() => {
    if (auth.status === 'in') navigate('/app', true);
  }, [auth.status]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <Link href="/" className="brand" aria-label="wemakesucess home">
        <span className="mark" aria-hidden="true">
          w
        </span>
        <span className="brand-name">wemakesucess</span>
      </Link>
      <div className="auth-card">
        {auth.status === 'off' ? (
          <>
            <h1>Sign-in is coming soon</h1>
            <p className="muted">For now your resumes are saved in this browser. Nothing is lost when you come back on this device.</p>
            <Link href="/app" className="btn primary wide">
              Go to My Documents
            </Link>
          </>
        ) : sent ? (
          <>
            <h1>Check your email</h1>
            <p className="muted">
              We sent a sign-in link to <b>{email}</b>. Open it on this device to continue. It can take a minute; check spam if it does not
              arrive.
            </p>
            <button type="button" className="btn ghost" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h1>Sign in or create an account</h1>
            <p className="muted">Keep your resumes and purchases in your account and open them on any device. No password needed.</p>
            <button type="button" className="btn wide google" disabled={busy} onClick={() => run(signInWithGoogle)}>
              <GoogleLogo />
              Continue with Google
            </button>
            <div className="or">
              <span>or</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await signInWithEmail(email.trim());
                  setSent(true);
                });
              }}
            >
              <div className="field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn primary wide" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
            {err && <p className="err">{err}</p>}
            <p className="fine">
              By continuing you agree to the <a href="/legal/terms.html">Terms</a> and <a href="/legal/privacy.html">Privacy Policy</a>. Resumes you
              made before signing in are added to your account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
