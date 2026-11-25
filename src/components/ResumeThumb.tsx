import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { coverHTML, type CoverLetter } from '../shared/cover';
import { resumeHTML } from '../shared/render';
import type { Resume } from '../shared/resume';

/**
 * A real, scaled-down render of a resume's first page (same HTML as the PDF).
 * Fills its container's width, up to `max` pixels.
 */
export function ResumeThumb({ resume, cover, max = 260 }: { resume?: Resume; cover?: CoverLetter; max?: number }) {
  const html = useMemo(() => (cover ? coverHTML(cover) : resume ? resumeHTML(resume) : ''), [resume, cover]);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(max);

  useLayoutEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setWidth(Math.max(80, Math.min(max, inner)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);

  const scale = width / 794;
  return (
    <div ref={box} className="rthumb" style={{ width, height: 1123 * scale }} aria-hidden="true">
      <div className="sheet" style={{ transform: `scale(${scale})`, height: 1123, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
