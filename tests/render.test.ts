import { describe, expect, it } from 'vitest';
import { atsChecks, atsScore } from '../src/shared/ats';
import { fileName, plainText, resumeHTML } from '../src/shared/render';
import { BLANK, cloneResume, normalizeResume, SAMPLE, TEMPLATES } from '../src/shared/resume';

describe('resumeHTML', () => {
  it('keeps the ATS reading order: name, contact, then standard sections', () => {
    const html = resumeHTML(SAMPLE);
    const order = ['Ananya Krishnan', 'ananya.k@example.com', 'Summary', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications', 'Languages'];
    const pos = order.map((s) => html.indexOf(s));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it('uses the same markup for every template, only the class changes', () => {
    const strip = (h: string) => h.replace(/class="r t-\w+ f-\w+"/, '');
    const base = strip(resumeHTML({ ...SAMPLE, template: 'modern' }));
    for (const t of TEMPLATES) expect(strip(resumeHTML({ ...SAMPLE, template: t.id, font: 'sans' }))).toBe(base);
  });

  it('has no tables or images, which ATS misread', () => {
    expect(resumeHTML(SAMPLE)).not.toMatch(/<(table|img|svg|canvas)/);
  });

  it('escapes user input', () => {
    const r = cloneResume(SAMPLE);
    r.contact.name = '<script>alert(1)</script>';
    r.accent = '"><img src=x>';
    const html = resumeHTML(r);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
  });

  it('omits empty sections and strips typed bullet characters', () => {
    const r = normalizeResume({ contact: { name: 'A' }, experience: [{ role: 'Dev', bullets: '• Built X\n- Shipped Y\n\n' }] });
    const html = resumeHTML(r);
    expect(html).not.toContain('<h2>Education</h2>');
    expect(html).toContain('<li>Built X</li><li>Shipped Y</li>');
  });
});

describe('plainText', () => {
  it('produces paste-ready text with uppercase headings', () => {
    const t = plainText(SAMPLE);
    expect(t.startsWith('Ananya Krishnan\nSenior Software Engineer')).toBe(true);
    expect(t).toContain('\nEXPERIENCE\nSenior Software Engineer, Kiranakart Technologies, Bengaluru (Apr 2022 – Present)\n- Led');
    expect(t).not.toMatch(/\n{3,}/);
  });
  it('skips blank entries', () => {
    const r = cloneResume(SAMPLE);
    r.experience.push({ ...BLANK.experience });
    expect(plainText(r)).not.toContain(', ()');
  });
});

describe('normalizeResume', () => {
  it('rejects bad enums and caps strings', () => {
    const r = normalizeResume({ template: 'fancy', font: 'comic', accent: 'red', summary: 'x'.repeat(10000), experience: 'nope' });
    expect(r.template).toBe('modern');
    expect(r.font).toBe('sans');
    expect(r.accent).toBe('#1f3a68');
    expect(r.summary.length).toBe(4000);
    expect(r.experience).toEqual([]);
  });
  it('round-trips the sample', () => {
    expect(normalizeResume(JSON.parse(JSON.stringify(SAMPLE)))).toEqual(SAMPLE);
  });
});

describe('ATS check', () => {
  it('scores the sample resume fully', () => {
    expect(atsScore(atsChecks(SAMPLE))).toBe(100);
  });
  it('flags a nearly empty resume', () => {
    const checks = atsChecks(normalizeResume({ contact: { name: 'A' } }));
    expect(atsScore(checks)).toBeLessThan(30);
  });
});

describe('fileName', () => {
  it('is filesystem safe', () => {
    expect(fileName(SAMPLE)).toBe('Ananya_Krishnan_Resume.pdf');
    expect(fileName(normalizeResume({ contact: { name: 'a/b: c' } }))).toBe('a_b_c_Resume.pdf');
    expect(fileName(normalizeResume({}))).toBe('Resume.pdf');
  });
});

describe('resume CSS', () => {
  it('keeps letter-spacing small enough that PDF text extraction does not split words', async () => {
    const { RESUME_CSS } = await import('../src/shared/resumeCss');
    const values = [...RESUME_CSS.matchAll(/letter-spacing:\s*(-?[\d.]+)em/g)].map((m) => parseFloat(m[1]));
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(v).toBeLessThanOrEqual(0.1);
  });
});

describe('layout and extra sections', () => {
  it('follows the chosen order and leaves hidden sections out of HTML and plain text', () => {
    const r = cloneResume(SAMPLE);
    r.layout.order = ['skills', ...r.layout.order.filter((k) => k !== 'skills')];
    r.layout.hidden = ['summary'];
    const html = resumeHTML(r);
    expect(html.indexOf('>Skills<')).toBeLessThan(html.indexOf('>Experience<'));
    expect(html).not.toContain('>Summary<');
    const txt = plainText(r);
    expect(txt.indexOf('SKILLS')).toBeLessThan(txt.indexOf('EXPERIENCE'));
    expect(txt).not.toContain('SUMMARY');
  });

  it('renders awards, volunteering, interests and custom sections with escaped titles', () => {
    const r = cloneResume(SAMPLE);
    r.awards = 'Hackathon winner';
    r.interests = 'Chess, Running';
    r.volunteering = [{ ...r.experience[0], role: 'Mentor', company: 'Code Club', bullets: 'Taught kids' }];
    r.custom = [{ title: 'Talks <b>', body: 'PyCon India 2025' }];
    const html = resumeHTML(r);
    for (const s of ['Hackathon winner', 'Chess, Running', 'Mentor', 'Code Club', 'PyCon India 2025', 'Talks &lt;b&gt;']) expect(html).toContain(s);
    expect(html).not.toContain('<b>');
    expect(plainText(r)).toContain('TALKS <B>');
  });

  it('clamps layout values and restores missing sections when loading saved data', () => {
    const r = normalizeResume({ layout: { order: ['skills', 'bogus', 'skills'], hidden: ['nope', 'awards'], margin: 99, spacing: 0, fontScale: 'x' } });
    expect(r.layout.order[0]).toBe('skills');
    expect(new Set(r.layout.order).size).toBe(r.layout.order.length);
    expect(r.layout.order).toContain('experience');
    expect(r.layout.hidden).toEqual(['awards']);
    expect(r.layout.margin).toBe(22);
    expect(r.layout.spacing).toBe(0.6);
    expect(r.layout.fontScale).toBe(1);
  });

  it('keeps only small data-URL photos', () => {
    expect(normalizeResume({ photo: 'javascript:alert(1)' }).photo).toBe('');
    expect(normalizeResume({ photo: 'data:image/jpeg;base64,AAAA' }).photo).toBe('data:image/jpeg;base64,AAAA');
    expect(normalizeResume({ photo: 'data:image/jpeg;base64,' + 'A'.repeat(300_000) }).photo).toBe('');
  });

  it('round-trips the sample unchanged', () => {
    expect(normalizeResume(JSON.parse(JSON.stringify(SAMPLE)))).toEqual(SAMPLE);
  });
});
