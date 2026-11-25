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
