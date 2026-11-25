import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { resumeHTML } from '../shared/render';
import type { Resume } from '../shared/resume';

const PAGE_W = 794; // A4 at 96 dpi
const PAGE_H = 1123;

/** Live A4 preview, scaled to fit, with dashed page-break markers. */
export function Preview({ resume }: { resume: Resume }) {
  const wrap = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pages, setPages] = useState(1);
  const html = useMemo(() => resumeHTML(resume), [resume]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!wrap.current || !content.current) return;
      setScale(Math.min(1, (wrap.current.clientWidth - 40) / PAGE_W));
      // 106 = sheet's vertical padding (53px top and bottom)
      setPages(Math.max(1, Math.ceil((content.current.offsetHeight + 106 - 2) / PAGE_H)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    if (content.current) ro.observe(content.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [html]);

  const h = pages * PAGE_H;
  return (
    <div className="paper-wrap" ref={wrap}>
      <div className="paper-scale" style={{ width: PAGE_W * scale, height: h * scale }}>
        <div className="sheet shadow" style={{ transform: `scale(${scale})`, minHeight: h }}>
          <div ref={content} dangerouslySetInnerHTML={{ __html: html }} />
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} className="pb" style={{ top: (i + 1) * PAGE_H }}>
              <span>Page {i + 2}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
