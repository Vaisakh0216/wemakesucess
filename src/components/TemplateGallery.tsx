import { useState } from 'react';
import { createDoc } from '../docs';
import { navigate } from '../router';
import { SAMPLE, TEMPLATE_FILTERS, TEMPLATES, type TemplateId } from '../shared/resume';
import { ResumeThumb } from './ResumeThumb';

/** Filterable template gallery; picking one creates a new document and opens the editor. */
export function TemplateGallery({ onPick }: { onPick?: (t: TemplateId) => void }) {
  const [filter, setFilter] = useState('All');
  const shown = TEMPLATES.filter((t) => filter === 'All' || t.tags.includes(filter));
  const pick =
    onPick ??
    ((t: TemplateId) => {
      const tpl = TEMPLATES.find((x) => x.id === t)!;
      const doc = createDoc({ data: { ...SAMPLE, template: t, font: tpl.font } });
      navigate(`/edit/${doc.id}`);
    });
  return (
    <div className="gallery">
      <div className="chips" role="group" aria-label="Filter templates">
        {TEMPLATE_FILTERS.map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="tgrid">
        {shown.map((t) => (
          <div className="tcard" key={t.id}>
            <button type="button" className="tcard-img" onClick={() => pick(t.id)} aria-label={`Use the ${t.name} template`}>
              <span className="ats-badge">ATS-safe</span>
              <ResumeThumb resume={{ ...SAMPLE, template: t.id, font: t.font }} max={260} />
              <span className="tcard-cta">Use this template</span>
            </button>
            <b>{t.name}</b>
            <span>{t.desc}</span>
          </div>
        ))}
        {!shown.length && <p className="muted">No templates in this category yet.</p>}
      </div>
    </div>
  );
}
