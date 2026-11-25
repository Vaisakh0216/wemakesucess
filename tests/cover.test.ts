import { describe, expect, it } from 'vitest';
import { coverFromResume, coverHTML, coverPlainText, normalizeCover } from '../src/shared/cover';
import { SAMPLE } from '../src/shared/resume';

describe('cover letters', () => {
  it('copy the resume design and contact details', () => {
    const c = coverFromResume(SAMPLE, '3f2b8c1e-5d4a-4b6f-9e2d-1a2b3c4d5e6f');
    expect(c.contact).toEqual(SAMPLE.contact);
    expect([c.template, c.accent, c.font]).toEqual([SAMPLE.template, SAMPLE.accent, SAMPLE.font]);
    expect(c.signature).toBe(SAMPLE.contact.name);
    expect(c.resumeId).toBe('3f2b8c1e-5d4a-4b6f-9e2d-1a2b3c4d5e6f');
  });

  it('render escaped paragraphs in letter order', () => {
    const c = normalizeCover({
      contact: { name: 'Asha <b>' },
      recipient: { name: 'Priya Nair', company: 'Infosys', address: 'Electronics City\nBengaluru' },
      date: '25 November 2026',
      subject: 'Data Analyst',
      greeting: 'Dear Priya,',
      body: 'One.\n\nTwo <script>.',
      closing: 'Yours sincerely,',
      signature: 'Asha',
    });
    const html = coverHTML(c);
    expect(html).not.toContain('<script>');
    expect(html).toContain('Asha &lt;b&gt;');
    const order = ['25 November 2026', 'Priya Nair', 'Electronics City<br>Bengaluru', 'Re: Data Analyst', 'Dear Priya,', '<p>One.</p>', 'Two &lt;script&gt;.', 'Yours sincerely,'];
    const pos = order.map((s) => html.indexOf(s));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(coverPlainText(c)).toContain('Re: Data Analyst\n\nDear Priya,');
  });

  it('clean up junk input', () => {
    const c = normalizeCover({ template: 'nope', accent: 'red', resumeId: '../x', layout: { margin: 99 } });
    expect([c.template, c.accent, c.resumeId, c.layout.margin]).toEqual(['modern', '#1f3a68', '', 22]);
  });
});
