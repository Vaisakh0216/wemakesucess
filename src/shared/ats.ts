import type { Resume } from './resume';
import { csv, lines } from './text';

export interface AtsCheck {
  ok: boolean;
  /** Shown when the check passes. */
  pass: string;
  /** Shown when it fails: what to fix. */
  fix: string;
}

const VERBS =
  /^(led|built|designed|developed|created|launched|managed|improved|reduced|increased|cut|delivered|introduced|migrated|mentored|drove|owned|automated|implemented|analysed|analyzed|optimised|optimized|grew|negotiated|trained|planned|achieved|resolved|streamlined|established|coordinated|recovered|shipped|won|handled|supported|prepared|conducted|organised|organized|executed|generated|maintained|oversaw|spearheaded|tested|wrote)\b/i;

export function atsChecks(r: Resume): AtsCheck[] {
  const c = r.contact;
  const jobs = r.experience.filter((e) => e.role || e.company);
  const bullets = jobs.flatMap((e) => lines(e.bullets));
  const words = r.summary.trim().split(/\s+/).filter(Boolean).length;
  const share = (re: RegExp) => (bullets.length ? bullets.filter((b) => re.test(b)).length / bullets.length : 0);
  const skills = csv(r.skills).length;
  return [
    {
      ok: !!c.name.trim() && /\S+@\S+\.\S+/.test(c.email) && c.phone.replace(/\D/g, '').length >= 6,
      pass: 'Name, email and phone are present',
      fix: 'Add your full name, a valid email and a phone number.',
    },
    {
      ok: !!c.title.trim(),
      pass: 'Target job title under your name',
      fix: 'Add the job title you are applying for; ATS match on it.',
    },
    {
      ok: words >= 25 && words <= 90,
      pass: `Summary length is ${words} words`,
      fix: `Summary has ${words} words. Aim for 25 to 90.`,
    },
    {
      ok: jobs.length > 0 && jobs.every((e) => e.start && e.end),
      pass: 'Every job has start and end dates',
      fix: 'Add start and end dates to every job (use “Present” for your current one).',
    },
    {
      ok: jobs.length > 0 && bullets.length >= 3 * Math.min(jobs.length, 2),
      pass: `${bullets.length} achievement lines in Experience`,
      fix: 'Give your recent jobs at least 3 achievement lines each.',
    },
    {
      ok: share(VERBS) >= 0.6,
      pass: 'Achievements start with action verbs',
      fix: 'Start more lines with verbs like Led, Built, Reduced, Launched.',
    },
    {
      ok: share(/\d/) >= 0.4,
      pass: 'Results are quantified',
      fix: 'Add numbers (%, ₹, users, time saved) to at least 40% of lines.',
    },
    {
      ok: skills >= 6,
      pass: `${skills} skills listed`,
      fix: 'List at least 6 skills, using the job description’s wording.',
    },
    {
      ok: r.education.some((e) => e.degree || e.school),
      pass: 'Education included',
      fix: 'Add at least one education entry.',
    },
    { ok: true, pass: 'Single-column layout with standard headings', fix: '' },
  ];
}

export function atsScore(checks: AtsCheck[]): number {
  return Math.round((checks.filter((x) => x.ok).length / checks.length) * 100);
}
