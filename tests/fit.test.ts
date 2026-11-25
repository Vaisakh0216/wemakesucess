import { describe, expect, it } from 'vitest';
import { tighten } from '../src/pages/EditorPage';
import { DEFAULT_LAYOUT, LIMITS, type Layout } from '../src/shared/resume';

describe('fit to one page', () => {
  it('tightens spacing, then margins, then font size, and stops at the minimum', () => {
    let l: Layout = { ...DEFAULT_LAYOUT };
    const seen: string[] = [];
    for (let i = 0; i < 50; i++) {
      const n = tighten(l);
      if (!n) break;
      seen.push(Object.keys(n)[0]);
      l = { ...l, ...n };
    }
    expect(seen[0]).toBe('spacing');
    expect(seen.indexOf('margin')).toBeGreaterThan(seen.lastIndexOf('spacing'));
    expect(seen.indexOf('fontScale')).toBeGreaterThan(seen.lastIndexOf('margin'));
    expect([l.spacing, l.margin, l.fontScale]).toEqual([LIMITS.spacing[0], LIMITS.margin[0], LIMITS.fontScale[0]]);
  });
});
