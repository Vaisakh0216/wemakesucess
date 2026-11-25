/** Cover letter model and renderer. Uses the same designs, fonts and header as the resume. */
import { headerHTML } from './render.js';
import { ACCENTS, FONTS, LIMITS, TEMPLATES, type Contact, type FontId, type Resume, type TemplateId } from './resume.js';
import { esc } from './text.js';

export interface Recipient {
  name: string;
  title: string;
  company: string;
  address: string;
}

export interface CoverLetter {
  template: TemplateId;
  accent: string;
  font: FontId;
  contact: Contact;
  recipient: Recipient;
  /** Free text, e.g. "25 November 2026". */
  date: string;
  /** Optional "Re:" line, e.g. the job title and reference number. */
  subject: string;
  greeting: string;
  /** Paragraphs separated by a blank line. */
  body: string;
  closing: string;
  signature: string;
  layout: { margin: number; fontScale: number };
  /** The resume this letter goes with ('' if none); AI drafts use its content. */
  resumeId: string;
}

export const todayIN = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export const SAMPLE_BODY = `I am writing to apply for the [Job title] role at [Company]. With [N] years of experience in [your field], I have [your strongest relevant result].

In my current role at [Current company], I [an achievement that matches the job description, with a number]. I also [a second relevant achievement or skill].

I would welcome the chance to discuss how I can help [Company] [a goal from the job description]. Thank you for your time and consideration.`;

/** A new letter that matches a resume's design and contact details. */
export function coverFromResume(r: Resume | null, resumeId = ''): CoverLetter {
  return normalizeCover({
    template: r?.template,
    accent: r?.accent,
    font: r?.font,
    contact: r?.contact,
    date: todayIN(),
    greeting: 'Dear Hiring Manager,',
    body: SAMPLE_BODY,
    closing: 'Yours sincerely,',
    signature: r?.contact.name ?? '',
    resumeId,
  });
}

const s = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const pick = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
const clamp = (v: unknown, [lo, hi]: readonly [number, number], d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

export function normalizeCover(input: unknown): CoverLetter {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const c = (o.contact && typeof o.contact === 'object' ? o.contact : {}) as Record<string, unknown>;
  const to = (o.recipient && typeof o.recipient === 'object' ? o.recipient : {}) as Record<string, unknown>;
  const l = (o.layout && typeof o.layout === 'object' ? o.layout : {}) as Record<string, unknown>;
  const accent = typeof o.accent === 'string' && /^#[0-9a-f]{6}$/i.test(o.accent) ? o.accent : ACCENTS[0];
  return {
    template: pick(o.template, TEMPLATES.map((t) => t.id), 'modern'),
    accent,
    font: pick(o.font, FONTS.map((f) => f.id), 'sans'),
    contact: {
      name: s(c.name, 120),
      title: s(c.title, 120),
      email: s(c.email, 120),
      phone: s(c.phone, 40),
      location: s(c.location, 120),
      linkedin: s(c.linkedin, 200),
      website: s(c.website, 200),
    },
    recipient: { name: s(to.name, 120), title: s(to.title, 120), company: s(to.company, 120), address: s(to.address, 300) },
    date: s(o.date, 60),
    subject: s(o.subject, 200),
    greeting: s(o.greeting, 120),
    body: s(o.body, 8000),
    closing: s(o.closing, 60),
    signature: s(o.signature, 120),
    layout: { margin: clamp(l.margin, LIMITS.margin, 18), fontScale: clamp(l.fontScale, LIMITS.fontScale, 1) },
    resumeId: typeof o.resumeId === 'string' && /^[0-9a-f-]{36}$/i.test(o.resumeId) ? o.resumeId : '',
  };
}

export function coverHTML(c: CoverLetter): string {
  const para = (t: string) =>
    t
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  const to = [c.recipient.name, c.recipient.title, c.recipient.company, ...c.recipient.address.split('\n')]
    .map((x) => x.trim())
    .filter(Boolean)
    .map(esc)
    .join('<br>');
  return `<article class="r cover t-${c.template} f-${c.font}" style="--rc:${esc(c.accent)};--fs:${c.layout.fontScale};--sp:1">
${headerHTML(c.contact)}
<div class="letter">${c.date ? `<p class="date">${esc(c.date)}</p>` : ''}${to ? `<p class="to">${to}</p>` : ''}${
    c.subject ? `<p class="subject"><b>Re: ${esc(c.subject)}</b></p>` : ''
  }${c.greeting ? `<p>${esc(c.greeting)}</p>` : ''}${para(c.body)}${c.closing ? `<p class="closing">${esc(c.closing)}</p>` : ''}${
    c.signature ? `<p class="signature">${esc(c.signature)}</p>` : ''
  }</div>
</article>`;
}

export function coverFileName(c: CoverLetter): string {
  const base = c.contact.name.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  const co = c.recipient.company.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  return [base, 'Cover_Letter', co].filter(Boolean).join('_') + '.pdf';
}

export function coverPlainText(c: CoverLetter): string {
  const to = [c.recipient.name, c.recipient.title, c.recipient.company, c.recipient.address].filter((x) => x.trim()).join('\n');
  return [c.date, to, c.subject && `Re: ${c.subject}`, c.greeting, c.body.trim(), c.closing, c.signature]
    .filter(Boolean)
    .join('\n\n');
}
