import type { Resume } from './resume.js';
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
  const sec = (title: string, body: string) => (body ? `<section><h2>${title}</h2>${body}</section>` : '');
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
  const sk = csv(r.skills);
  const certs = lines(r.certifications);
  const langs = csv(r.languages);

  return `<article class="r t-${r.template} f-${r.font}" style="--rc:${esc(r.accent)}">
<header><h1>${esc(c.name) || 'Your Name'}</h1>${c.title ? `<p class="headline">${esc(c.title)}</p>` : ''}${
    contact ? `<p class="contact">${contact}</p>` : ''
  }</header>
${sec('Summary', r.summary.trim() ? `<p>${esc(r.summary)}</p>` : '')}
${sec('Experience', exp)}
${sec('Education', edu)}
${sec('Skills', sk.length ? `<p class="skills">${sk.map(esc).join(', ')}</p>` : '')}
${sec('Projects', prj)}
${sec('Certifications', certs.length ? `<ul>${certs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '')}
${sec('Languages', langs.length ? `<p>${langs.map(esc).join(', ')}</p>` : '')}
</article>`;
}

/** Plain-text version for pasting into job portal forms. */
export function plainText(r: Resume): string {
  const c = r.contact;
  const out: string[] = [];
  const dates = (a: string, b: string) => [a, b].filter(Boolean).join(' – ');
  out.push(c.name, c.title, [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean).join(' | '), '');
  if (r.summary.trim()) out.push('SUMMARY', r.summary.trim(), '');
  const exp = r.experience.filter((e) => e.role || e.company);
  if (exp.length) {
    out.push('EXPERIENCE');
    for (const e of exp) {
      const d = dates(e.start, e.end);
      out.push([e.role, e.company, e.location].filter(Boolean).join(', ') + (d ? ` (${d})` : ''));
      lines(e.bullets).forEach((b) => out.push('- ' + b));
    }
    out.push('');
  }
  const edu = r.education.filter((e) => e.degree || e.school);
  if (edu.length) {
    out.push('EDUCATION');
    for (const e of edu) {
      const d = dates(e.start, e.end);
      out.push([e.degree, e.school].filter(Boolean).join(', ') + (d ? ` (${d})` : ''));
      if (e.details) out.push(e.details);
    }
    out.push('');
  }
  if (csv(r.skills).length) out.push('SKILLS', csv(r.skills).join(', '), '');
  const prj = r.projects.filter((p) => p.name);
  if (prj.length) {
    out.push('PROJECTS');
    for (const p of prj) {
      out.push(p.name + (p.link ? ` (${p.link})` : ''));
      lines(p.bullets).forEach((b) => out.push('- ' + b));
    }
    out.push('');
  }
  if (lines(r.certifications).length) out.push('CERTIFICATIONS', ...lines(r.certifications).map((x) => '- ' + x), '');
  if (csv(r.languages).length) out.push('LANGUAGES', csv(r.languages).join(', '));
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fileName(r: Resume): string {
  const base = r.contact.name.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  return base ? `${base}_Resume.pdf` : 'Resume.pdf';
}
