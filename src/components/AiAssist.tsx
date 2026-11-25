import { useEffect, useState } from 'react';
import { accessToken, useAuth } from '../cloud';
import { fetchConfig } from '../payments';
import { Link } from '../router';

export type AiKind = 'summary' | 'bullets' | 'skills' | 'improve';
export type AiContext = Partial<Record<'title' | 'role' | 'company' | 'roles' | 'skills' | 'text', string>>;

const MESSAGES: Record<string, string> = {
  daily_limit: 'You have used today’s AI suggestions. More tomorrow.',
  add_a_job_title_first: 'Add your target job title (Contact step) or this job’s title first.',
  nothing_to_improve: 'Write something first, then improve it.',
  sign_in_required: 'Please sign in again to use AI help.',
  ai_declined: 'AI could not help with this text. Try rewording it.',
};

let aiOn: boolean | null = null;

/** Whether the server has AI writing help switched on (checked once). */
function useAiAvailable() {
  const [on, setOn] = useState(aiOn);
  useEffect(() => {
    if (aiOn === null) fetchConfig().then((c) => setOn((aiOn = !!c.ai)));
  }, []);
  return on;
}

interface Props {
  kind: AiKind;
  label: string;
  context: () => AiContext;
  /** Called for one suggestion the user picks. */
  onPick: (s: string) => void;
  pickLabel?: string;
  /** Optional: use every suggestion at once (for rewrites of a whole list). */
  onUseAll?: (all: string[]) => void;
}

/** "Generate with AI" button and its list of suggestions. Hidden when AI is off on the server. */
export function AiAssist({ kind, label, context, onPick, pickLabel = 'Add', onUseAll }: Props) {
  const available = useAiAvailable();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  if (!available) return null;

  const run = async () => {
    setOpen(true);
    setErr(null);
    if (auth.status !== 'in') return;
    setBusy(true);
    try {
      const token = await accessToken();
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ kind, context: context() }),
      });
      const data = (await res.json().catch(() => ({}))) as { suggestions?: string[]; remaining?: number; error?: string };
      if (!res.ok || !data.suggestions) throw new Error(MESSAGES[data.error ?? ''] ?? 'AI help is unavailable right now. Please try again.');
      setItems(data.suggestions);
      setUsed(new Set());
      setLeft(data.remaining ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI help is unavailable right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai">
      <button type="button" className="ai-btn" onClick={run} disabled={busy}>
        <span aria-hidden="true">✦</span> {busy ? 'Writing…' : label}
      </button>
      {open && (
        <div className="ai-panel" aria-live="polite">
          <button type="button" className="ai-close" aria-label="Close suggestions" onClick={() => setOpen(false)}>
            ✕
          </button>
          {auth.status !== 'in' ? (
            <p>
              <Link href="/login">Sign in</Link> to use AI writing help. It is free with your account, up to a daily limit.
            </p>
          ) : err ? (
            <p className="err">{err}</p>
          ) : busy && !items.length ? (
            <p className="muted">Writing suggestions…</p>
          ) : (
            <>
              <ul className="ai-list">
                {items.map((s, i) => (
                  <li key={i}>
                    <span>{s}</span>
                    <button
                      type="button"
                      className="btn small"
                      disabled={used.has(i)}
                      onClick={() => {
                        onPick(s);
                        setUsed(new Set(used).add(i));
                      }}
                    >
                      {used.has(i) ? 'Added' : pickLabel}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="ai-foot">
                {onUseAll && items.length > 0 && (
                  <button type="button" className="btn small primary" onClick={() => (onUseAll(items), setOpen(false))}>
                    Replace with all of these
                  </button>
                )}
                <button type="button" className="btn small ghost" onClick={run} disabled={busy}>
                  Try again
                </button>
                <span className="muted">
                  Check facts and fill in any [placeholders].{left !== null && ` ${left} left today.`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
