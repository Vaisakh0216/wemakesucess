import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { coverHTML, type CoverLetter } from '../shared/cover';
import { resumeHTML } from '../shared/render';
import type { Resume, SectionKey } from '../shared/resume';

const PAGE_W = 794; // A4 at 96 dpi
const PAGE_H = 1123;
const PX_PER_MM = 96 / 25.4;

export interface Issue {
  section: SectionKey | 'contact';
  message: string;
}

interface Props {
  resume?: Resume;
  cover?: CoverLetter;
  issues?: Issue[];
  onIssue?: (section: Issue['section']) => void;
  onPages?: (pages: number) => void;
}

/**
 * Live A4 preview, scaled to fit. Shows where pages break (as the PDF will, using
 * the chosen margins) and pins ATS issues next to the section they belong to.
 */
export function Preview({ resume, cover, issues = [], onIssue, onPages }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pages, setPages] = useState(1);
  const [pins, setPins] = useState<{ top: number; section: Issue['section']; messages: string[] }[]>([]);
  const html = useMemo(() => (cover ? coverHTML(cover) : resume ? resumeHTML(resume) : ''), [resume, cover]);
  const margin = (cover ?? resume)?.layout.margin ?? 14;
  const padY = Math.round(margin * PX_PER_MM);
  // Matches the @page margins in document.ts.
  const padX = Math.round((margin + (cover ? 2 : 1)) * PX_PER_MM);
  const usable = PAGE_H - 2 * padY;
  const issueKey = issues.map((i) => i.section + i.message).join('|');

  useLayoutEffect(() => {
    const measure = () => {
      if (!wrap.current || !content.current) return;
      setScale(Math.min(1, (wrap.current.clientWidth - 40) / PAGE_W));
      const n = Math.max(1, Math.ceil((content.current.offsetHeight - 2) / usable));
      setPages(n);
      onPages?.(n);
      const grouped = new Map<Issue['section'], string[]>();
      for (const i of issues) grouped.set(i.section, [...(grouped.get(i.section) ?? []), i.message]);
      const next: typeof pins = [];
      grouped.forEach((messages, section) => {
        const el = content.current!.querySelector<HTMLElement>(section === 'contact' ? 'header' : `[data-sec="${section}"]`);
        next.push({ top: padY + (el ? el.offsetTop : 0), section, messages });
      });
      setPins(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    if (content.current) ro.observe(content.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, usable, padY, issueKey]);

  const h = pages * PAGE_H;
  return (
    <div className="paper-wrap" ref={wrap}>
      <div className="paper-scale" style={{ width: PAGE_W * scale, height: h * scale }}>
        <div
          className="sheet shadow"
          style={{ transform: `scale(${scale})`, minHeight: h, padding: `${padY}px ${padX}px` }}
        >
          <div ref={content} dangerouslySetInnerHTML={{ __html: html }} />
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} className="pb" style={{ top: padY + (i + 1) * usable }}>
              <span>Page {i + 2}</span>
            </div>
          ))}
          {pins.map((p) => (
            <button
              key={p.section}
              type="button"
              className="pin"
              style={{ top: p.top }}
              title={p.messages.join('\n')}
              aria-label={`ATS: ${p.messages.join('. ')}`}
              onClick={() => onIssue?.(p.section)}
            >
              !<span className="pin-tip">{p.messages.join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
