import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ACCENTS, DEFAULT_LAYOUT, FONTS, LIMITS, SECTIONS, TEMPLATES, type Layout, type Resume, type SectionKey } from '../shared/resume';
import { Thumb } from './Thumb';

type Panel = 'layout' | 'fonts' | 'themes' | null;

interface Props {
  resume: Resume;
  update: (fn: (r: Resume) => void) => void;
  setPath: (path: string, v: unknown) => void;
  pages: number;
  onFitOnePage: () => void;
  children?: ReactNode;
}

/** Layout, Fonts and Themes menus above the preview. */
export function DesignToolbar({ resume: r, update, setPath, pages, onFitOnePage, children }: Props) {
  const [open, setOpen] = useState<Panel>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const btn = (p: Exclude<Panel, null>, label: string, icon: string) => (
    <button type="button" className="tb-btn" aria-expanded={open === p} onClick={() => setOpen(open === p ? null : p)}>
      <span aria-hidden="true">{icon}</span> {label}
    </button>
  );
  const setLayout = (fn: (l: Layout) => void) => update((x) => fn(x.layout));

  return (
    <div className="toolbar" ref={root}>
      {btn('layout', 'Layout', '▤')}
      {btn('fonts', 'Fonts', 'A')}
      {btn('themes', 'Themes', '●')}
      <span className={'pages' + (pages > 1 ? ' multi' : '')} title="Pages in the PDF">
        {pages} {pages === 1 ? 'page' : 'pages'}
      </span>
      {pages > 1 && (
        <button type="button" className="tb-btn accent" onClick={onFitOnePage} title="Tighten spacing, margins and font size">
          Fit to 1 page
        </button>
      )}
      <span className="spacer" />
      {children}

      {open === 'layout' && (
        <div className="pop" role="dialog" aria-label="Layout">
          <h4>Sections</h4>
          <p className="pop-hint">Reorder or hide sections. Standard headings stay in place for ATS.</p>
          <ol className="sec-list">
            {r.layout.order.map((k, i) => {
              const meta = SECTIONS.find((s) => s.key === k)!;
              const hidden = r.layout.hidden.includes(k);
              const move = (d: number) =>
                setLayout((l) => {
                  [l.order[i], l.order[i + d]] = [l.order[i + d], l.order[i]];
                });
              return (
                <li key={k} className={hidden ? 'off' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!hidden}
                      onChange={() =>
                        setLayout((l) => {
                          l.hidden = hidden ? l.hidden.filter((x) => x !== k) : [...l.hidden, k as SectionKey];
                        })
                      }
                    />
                    {meta.label}
                  </label>
                  <button type="button" className="icon-btn" disabled={i === 0} aria-label={`Move ${meta.label} up`} onClick={() => move(-1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={i === r.layout.order.length - 1}
                    aria-label={`Move ${meta.label} down`}
                    onClick={() => move(1)}
                  >
                    ↓
                  </button>
                </li>
              );
            })}
          </ol>
          <h4>Space</h4>
          <Slider
            label="Content spacing"
            value={r.layout.spacing}
            range={LIMITS.spacing}
            step={0.05}
            fmt={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setPath('layout.spacing', v)}
          />
          <Slider
            label="Page margins"
            value={r.layout.margin}
            range={LIMITS.margin}
            step={1}
            fmt={(v) => `${v} mm`}
            onChange={(v) => setPath('layout.margin', v)}
          />
          <button
            type="button"
            className="btn ghost small"
            onClick={() =>
              setLayout((l) => {
                Object.assign(l, { ...DEFAULT_LAYOUT, order: [...DEFAULT_LAYOUT.order], hidden: [] });
              })
            }
          >
            Reset layout
          </button>
        </div>
      )}

      {open === 'fonts' && (
        <div className="pop" role="dialog" aria-label="Fonts">
          <h4>Font</h4>
          <div className="font-list">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`font-opt r f-${f.id}`}
                aria-pressed={r.font === f.id}
                onClick={() => update((x) => void (x.font = f.id))}
              >
                <b>{f.name}</b>
                <span>Ananya Krishnan · Senior Engineer</span>
              </button>
            ))}
          </div>
          <Slider
            label="Font size"
            value={r.layout.fontScale}
            range={LIMITS.fontScale}
            step={0.025}
            fmt={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setPath('layout.fontScale', v)}
          />
          <p className="pop-hint">All three fonts are embedded in the PDF and read cleanly by ATS.</p>
        </div>
      )}

      {open === 'themes' && (
        <div className="pop wide" role="dialog" aria-label="Themes">
          <h4>Template</h4>
          <div className="tpls">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="tpl"
                aria-pressed={r.template === t.id}
                onClick={() =>
                  update((x) => {
                    x.template = t.id;
                    x.font = t.font;
                  })
                }
              >
                <Thumb id={t.id} accent={r.accent} />
                <b>{t.name}</b>
              </button>
            ))}
          </div>
          <h4>Colour</h4>
          <div className="swatches">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                className="sw"
                aria-pressed={r.accent === c}
                aria-label={`Colour ${c}`}
                style={{ background: c }}
                onClick={() => update((x) => void (x.accent = c))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  range: readonly [number, number];
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span>
        {props.label} <b>{props.fmt(props.value)}</b>
      </span>
      <input
        type="range"
        min={props.range[0]}
        max={props.range[1]}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="ends">
        <small>Less</small>
        <small>More</small>
      </span>
    </label>
  );
}
