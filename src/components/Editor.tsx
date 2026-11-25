import { ACCENTS, BLANK, FONTS, TEMPLATES, type ListKey, type Resume } from '../shared/resume';
import { Field } from './Field';
import { Thumb } from './Thumb';

export const STEPS = [
  { id: 'design', label: 'Design' },
  { id: 'contact', label: 'Contact' },
  { id: 'summary', label: 'Summary' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'extras', label: 'Projects & more' },
] as const;
export type StepId = (typeof STEPS)[number]['id'];

interface Props {
  resume: Resume;
  step: StepId;
  onStep: (s: StepId) => void;
  setPath: (path: string, v: unknown) => void;
  update: (fn: (r: Resume) => void) => void;
  onReset: () => void;
  onDownload: () => void;
  priceLabel: string;
}

export function Editor({ resume: r, step, onStep, setPath, update, onReset, onDownload, priceLabel }: Props) {
  const f = (path: string, label: string, opts: Partial<Parameters<typeof Field>[0]> = {}) => {
    const value = path.split('.').reduce<any>((o, k) => o?.[k], r) ?? '';
    return <Field key={path} label={label} value={value} onChange={(v) => setPath(path, v)} {...opts} />;
  };

  const entryHead = (list: ListKey, i: number, title: string) => {
    const n = r[list].length;
    const move = (d: number) =>
      update((x) => {
        const arr = x[list] as unknown[];
        [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
      });
    return (
      <div className="entry-head">
        <strong>{title || 'Untitled'}</strong>
        <button className="icon-btn" type="button" disabled={i === 0} aria-label="Move up" onClick={() => move(-1)}>
          ↑
        </button>
        <button className="icon-btn" type="button" disabled={i === n - 1} aria-label="Move down" onClick={() => move(1)}>
          ↓
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label="Remove"
          onClick={() => update((x) => void (x[list] as unknown[]).splice(i, 1))}
        >
          ✕
        </button>
      </div>
    );
  };
  const addBtn = (list: ListKey, label: string) => (
    <button className="add" type="button" onClick={() => update((x) => void (x[list] as unknown[]).push({ ...BLANK[list] }))}>
      + {label}
    </button>
  );

  const idx = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[idx - 1];
  const next = STEPS[idx + 1];

  let body: React.ReactNode = null;
  if (step === 'design') {
    body = (
      <>
        <h2>Choose a design</h2>
        <p className="hint">
          All four layouts are single-column with standard headings and real text, so applicant tracking systems read
          them in order.
        </p>
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
              <span>{t.desc}</span>
            </button>
          ))}
        </div>
        <div className="field">
          <span className="label">Accent colour</span>
          <div className="swatches">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                className="sw"
                aria-pressed={r.accent === c}
                aria-label={`Accent ${c}`}
                style={{ background: c }}
                onClick={() => setPath('accent', c)}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">Font</span>
          <div className="seg">
            {FONTS.map((x) => (
              <button key={x.id} type="button" aria-pressed={r.font === x.id} onClick={() => setPath('font', x.id)}>
                {x.name}
              </button>
            ))}
          </div>
        </div>
        <button className="btn ghost small" type="button" onClick={onReset} style={{ alignSelf: 'flex-start' }}>
          Start over with the example resume
        </button>
      </>
    );
  } else if (step === 'contact') {
    body = (
      <>
        <h2>Contact details</h2>
        <p className="hint">Keep these in the main body. Some ATS skip text placed in page headers.</p>
        <div className="grid2">
          {f('contact.name', 'Full name', { span: true })}
          {f('contact.title', 'Target job title', { span: true, placeholder: 'e.g. Data Analyst' })}
          {f('contact.email', 'Email', { type: 'email' })}
          {f('contact.phone', 'Phone', { type: 'tel', placeholder: '+91 …' })}
          {f('contact.location', 'City, State')}
          {f('contact.linkedin', 'LinkedIn')}
          {f('contact.website', 'Portfolio / GitHub', { span: true })}
        </div>
      </>
    );
  } else if (step === 'summary') {
    body = (
      <>
        <h2>Professional summary</h2>
        <p className="hint">Two to four sentences: who you are, your strongest result, and the role you want.</p>
        {f('summary', 'Summary', { area: true, rows: 7 })}
      </>
    );
  } else if (step === 'experience') {
    body = (
      <>
        <h2>Work experience</h2>
        <p className="hint">
          Most recent first. One achievement per line; start with a verb and add a number where you can.
        </p>
        {r.experience.map((e, i) => (
          <div className="entry" key={i}>
            {entryHead('experience', i, e.role && e.company ? `${e.role} · ${e.company}` : e.role)}
            <div className="grid2">
              {f(`experience.${i}.role`, 'Job title')}
              {f(`experience.${i}.company`, 'Company')}
              {f(`experience.${i}.start`, 'Start', { placeholder: 'Jan 2022' })}
              {f(`experience.${i}.end`, 'End', { placeholder: 'Present' })}
              {f(`experience.${i}.location`, 'Location', { span: true })}
            </div>
            {f(`experience.${i}.bullets`, 'Achievements (one per line)', { area: true, rows: 5 })}
          </div>
        ))}
        {addBtn('experience', 'Add a job')}
      </>
    );
  } else if (step === 'education') {
    body = (
      <>
        <h2>Education</h2>
        {r.education.map((e, i) => (
          <div className="entry" key={i}>
            {entryHead('education', i, e.degree)}
            {f(`education.${i}.degree`, 'Degree')}
            {f(`education.${i}.school`, 'College / University')}
            <div className="grid2">
              {f(`education.${i}.start`, 'Start')}
              {f(`education.${i}.end`, 'End')}
              {f(`education.${i}.location`, 'Location')}
              {f(`education.${i}.details`, 'CGPA / Percentage / Honours')}
            </div>
          </div>
        ))}
        {addBtn('education', 'Add education')}
      </>
    );
  } else if (step === 'skills') {
    body = (
      <>
        <h2>Skills</h2>
        <p className="hint">
          Separate with commas. Copy the exact wording from the job description, for example “Microsoft Excel” rather
          than “spreadsheets”.
        </p>
        {f('skills', 'Skills', { area: true, rows: 5 })}
        {f('languages', 'Languages', { placeholder: 'English, Hindi' })}
      </>
    );
  } else {
    body = (
      <>
        <h2>Projects</h2>
        {r.projects.map((p, i) => (
          <div className="entry" key={i}>
            {entryHead('projects', i, p.name)}
            <div className="grid2">
              {f(`projects.${i}.name`, 'Project name')}
              {f(`projects.${i}.link`, 'Link')}
            </div>
            {f(`projects.${i}.bullets`, 'What you did (one per line)', { area: true, rows: 3 })}
          </div>
        ))}
        {addBtn('projects', 'Add a project')}
        <h2 style={{ marginTop: 6 }}>Certifications</h2>
        {f('certifications', 'One per line', { area: true, rows: 3 })}
      </>
    );
  }

  return (
    <aside className="editor">
      <nav className="steps" role="tablist" aria-label="Resume sections">
        {STEPS.map((s) => (
          <button key={s.id} className="step" role="tab" type="button" aria-selected={s.id === step} onClick={() => onStep(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      <div className="form" id="form">
        {body}
        <div className="nav">
          {prev ? (
            <button className="btn" type="button" onClick={() => onStep(prev.id)}>
              ← {prev.label}
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button className="btn primary" type="button" onClick={() => onStep(next.id)}>
              Next: {next.label} →
            </button>
          ) : (
            <button className="btn primary" type="button" onClick={onDownload}>
              Download PDF · {priceLabel}
            </button>
          )}
        </div>
        <footer className="legal">
          <a href="/legal/terms.html">Terms</a>
          <a href="/legal/privacy.html">Privacy</a>
          <a href="/legal/refunds.html">Refunds</a>
          <a href="/legal/delivery.html">Delivery</a>
          <a href="/legal/contact.html">Contact</a>
        </footer>
      </div>
    </aside>
  );
}
