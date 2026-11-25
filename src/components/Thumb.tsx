import type { CSSProperties } from 'react';
import type { TemplateId } from '../shared/resume';

/** Tiny schematic of each template for the design picker. */
export function Thumb({ id, accent: c }: { id: TemplateId; accent: string }) {
  const bars: Record<TemplateId, CSSProperties[]> = {
    modern: [
      { width: '55%', height: 7, background: c },
      { width: '35%' },
      { width: '30%', background: c, marginTop: 6 },
      {},
      { width: '85%' },
      { width: '30%', background: c, marginTop: 4 },
      { width: '90%' },
    ],
    classic: [
      { width: '50%', height: 7, margin: '0 auto', background: '#333' },
      { width: '60%', margin: '0 auto' },
      { height: 1.5, background: '#333', marginTop: 6 },
      {},
      { width: '80%' },
      { height: 1.5, background: '#333', marginTop: 4 },
      { width: '90%' },
    ],
    compact: [
      { width: '45%', height: 6, background: '#333' },
      { height: 2, background: c },
      { width: '25%', background: c },
      {},
      {},
      { width: '85%' },
      { width: '25%', background: c },
      {},
      { width: '70%' },
    ],
    executive: [
      { width: '58%', height: 8, background: '#333' },
      { width: '40%', background: c },
      { height: 3, borderTop: '1px solid #333', borderBottom: '1px solid #333', background: 'none', marginTop: 4 },
      { width: '35%', height: 5, background: c },
      {},
      { width: '80%' },
    ],
  };
  return (
    <div className="thumb" aria-hidden="true">
      {bars[id].map((s, i) => (
        <i key={i} style={s} />
      ))}
    </div>
  );
}
