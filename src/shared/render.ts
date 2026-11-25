import type { Resume, SectionKey } from './resume.js';
import { csv, esc, lines } from './text.js';

/**
 * Render a resume to semantic HTML. Every template shares this markup and differs
 * only in CSS (see resume.css), so ATS always see the same reading order:
 * name, headline, contact line, then each standard section heading and its content.
 */
export function resumeHTML(r: Resume): string {
  const c = r.contact;
  const contact = [c.email, c.phone, c.location, c.linkedin, c.website]
    .filter(Boolean)
    .map(esc)
    .join('<span class="sep">|</span>');
  const sec = (key: SectionKey, title: string, body: string) =>
    body ? `<section data-sec="${key}"><h2>${esc(title)}</h2>${body}</section>` : '';
  const when = (a: string, b: string) => [a, b].filter(Boolean).map(esc).join(' – ');
  const ul = (t: string) => {
    const l = lines(t);
    return l.length ? `<ul>${l.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  };
  const head = (main: string, org: string, loc: string, right: string) =>
    `<div class="row"><div><span class="role">${esc(main)}</span>${org ? `, <span class="org">${esc(org)}</span>` : ''}${
      loc ? `, ${esc(loc)}` : ''
    }</div><div class="when">${right}</div></div>`;

  const exp = r.experience
    .filter((e) => e.role || e.company)
    .map((e) => `<div class="item">${head(e.role, e.company, e.location, when(e.start, e.end))}${ul(e.bullets)}</div>`)
    .join('');
  const edu = r.education
    .filter((e) => e.degree || e.school)
    .map(
      (e) =>
        `<div class="item">${head(e.degree, e.school, e.location, when(e.start, e.end))}${
          e.details ? `<p>${esc(e.details)}</p>` : ''
        }</div>`,
    )
    .join('');
  const prj = r.projects
    .filter((p) => p.name)
    .map((p) => `<div class="item">${head(p.name, '', '', esc(p.link))}${ul(p.bullets)}</div>`)
    .join('');
  const vol = r.volunteering
    .filter((e) => e.role || e.company)
    .map((e) => `<div class="item">${head(e.role, e.company, e.location, when(e.start, e.end))}${ul(e.bullets)}</div>`)
    .join('');
  const list = (items: string[]) => (items.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const inline = (items: string[], cls = '') => (items.length ? `<p${cls ? ` class="${cls}"` : ''}>${items.map(esc).join(', ')}</p>` : '');

  const body: Record<SectionKey, () => string> = {
    summary: () => sec('summary', 'Summary', r.summary.trim() ? `<p>${esc(r.summary)}</p>` : ''),
    experience: () => sec('experience', 'Experience', exp),
    education: () => sec('education', 'Education', edu),
    skills: () => sec('skills', 'Skills', inline(csv(r.skills), 'skills')),
    projects: () => sec('projects', 'Projects', prj),
    certifications: () => sec('certifications', 'Certifications', list(lines(r.certifications))),
    awards: () => sec('awards', 'Awards', list(lines(r.awards))),
    volunteering: () => sec('volunteering', 'Volunteering', vol),
    languages: () => sec('languages', 'Languages', inline(csv(r.languages))),
    interests: () => sec('interests', 'Interests', inline(csv(r.interests))),
    custom: () =>
      r.custom
        .filter((x) => x.title.trim() && lines(x.body).length)
        .map((x) => sec('custom', x.title.trim(), list(lines(x.body))))
        .join('\n'),
  };
  const L = r.layout;
  const sections = L.order.filter((k) => !L.hidden.includes(k)).map((k) => body[k]()).filter(Boolean).join('\n');
  const vars = `--rc:${esc(r.accent)};--fs:${L.fontScale};--sp:${L.spacing}`;
  const photo = r.photo ? `<img class="photo" src="${esc(r.photo)}" alt="">` : '';

  return `<article class="r t-${r.template} f-${r.font}${photo ? ' has-photo' : ''}" style="${vars}">
<header>${photo}<div class="hd"><h1>${esc(c.name) || 'Your Name'}</h1>${c.title ? `<p class="headline">${esc(c.title)}</p>` : ''}${
    contact ? `<p class="contact">${contact}</p>` : ''
  }</div></header>
${sections}
</article>`;
}

/** Plain-text version for pasting into job portal forms. */
export function plainText(r: Resume): string {
  const c = r.contact;
  const out: string[] = [];
  const dates = (a: string, b: string) => [a, b].filter(Boolean).join(' – ');
  const jobs = (title: string, list: Resume['experience']) => {
    const xs = list.filter((e) => e.role || e.company);
    if (!xs.length) return;
    out.push(title);
    for (const e of xs) {
      const d = dates(e.start, e.end);
      out.push([e.role, e.company, e.location].filter(Boolean).join(', ') + (d ? ` (${d})` : ''));
      lines(e.bullets).forEach((b) => out.push('- ' + b));
    }
    out.push('');
  };
  const bullets = (title: string, items: string[]) => items.length && out.push(title, ...items.map((x) => '- ' + x), '');
  const inline = (title: string, items: string[]) => items.length && out.push(title, items.join(', '), '');

  out.push(c.name, c.title, [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean).join(' | '), '');
  const text: Record<SectionKey, () => void> = {
    summary: () => r.summary.trim() && out.push('SUMMARY', r.summary.trim(), ''),
    experience: () => jobs('EXPERIENCE', r.experience),
    education: () => {
      const edu = r.education.filter((e) => e.degree || e.school);
      if (!edu.length) return;
      out.push('EDUCATION');
      for (const e of edu) {
        const d = dates(e.start, e.end);
        out.push([e.degree, e.school].filter(Boolean).join(', ') + (d ? ` (${d})` : ''));
        if (e.details) out.push(e.details);
      }
      out.push('');
    },
    skills: () => inline('SKILLS', csv(r.skills)),
    projects: () => {
      const prj = r.projects.filter((p) => p.name);
      if (!prj.length) return;
      out.push('PROJECTS');
      for (const p of prj) {
        out.push(p.name + (p.link ? ` (${p.link})` : ''));
        lines(p.bullets).forEach((b) => out.push('- ' + b));
      }
      out.push('');
    },
    certifications: () => bullets('CERTIFICATIONS', lines(r.certifications)),
    awards: () => bullets('AWARDS', lines(r.awards)),
    volunteering: () => jobs('VOLUNTEERING', r.volunteering),
    languages: () => inline('LANGUAGES', csv(r.languages)),
    interests: () => inline('INTERESTS', csv(r.interests)),
    custom: () => r.custom.filter((x) => x.title.trim()).forEach((x) => bullets(x.title.trim().toUpperCase(), lines(x.body))),
  };
  r.layout.order.filter((k) => !r.layout.hidden.includes(k)).forEach((k) => text[k]());
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fileName(r: Resume): string {
  const base = r.contact.name.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  return base ? `${base}_Resume.pdf` : 'Resume.pdf';
}
