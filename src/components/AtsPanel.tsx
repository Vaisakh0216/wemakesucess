import type { AtsCheck } from '../shared/ats';

export function ScoreRing({ pct }: { pct: number }) {
  const col = pct >= 80 ? 'var(--good)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)';
  return (
    <span className="ring" style={{ background: `conic-gradient(${col} ${pct}%, var(--line) 0)` }}>
      <span>{pct}</span>
    </span>
  );
}

export function AtsPanel({ checks, pct }: { checks: AtsCheck[]; pct: number }) {
  return (
    <div className="ats-panel" id="atsPanel">
      <h3>ATS readiness: {pct}/100</h3>
      <ul>
        {checks.map((x, i) => (
          <li key={i} className={x.ok ? 'ok' : 'no'}>
            <span className="dot">{x.ok ? '✓' : '!'}</span>
            <span>{x.ok ? x.pass : x.fix}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
