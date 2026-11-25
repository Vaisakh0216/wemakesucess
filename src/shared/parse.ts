import { normalizeResume, type Resume, type SectionKey } from './resume.js';

/**
 * Turn the plain text of an existing resume (from a PDF or Word file) into our
 * resume model. Heuristic and forgiving: it finds standard section headings,
 * contact details and dated entries; whatever it cannot place goes into the
 * summary or a custom section so nothing is silently lost. The user reviews it all
 * in the editor afterwards.
 */

type Bucket = SectionKey | 'other';

const HEADINGS: [Bucket, RegExp][] = [
  ['summary', /^(professional |career |executive )?(summary|profile|objective|overview)$|^about( me)?$|^career objective$/],
  ['experience', /^(work |professional |relevant |employment )?(experience|history)$|^employment$|^work history$|^internships?$|^experience & internships$/],
  ['education', /^(education|academic (background|qualifications?|details)|educational qualifications?|qualifications?)$/],
  ['skills', /^((technical|key|core|professional|it) )?(skills|competencies|expertise)( & tools| and tools)?$|^tools( & technologies)?$|^technologies$/],
  ['projects', /^(academic |personal |key |selected )?projects$/],
  ['certifications', /^(certifications?|certificates|licen[cs]es( & certifications)?|courses|trainings?)$/],
  ['awards', /^(awards?|honou?rs|achievements|awards (&|and) (achievements|honou?rs)|accomplishments)$/],
  ['volunteering', /^(volunteer(ing)?( experience| work)?|extra[- ]?curricular( activities)?|positions of responsibility|leadership)$/],
  ['languages', /^languages( known)?$/],
  ['interests', /^(interests|hobbies( (&|and) interests)?)$/],
  ['other', /^(declaration|references|personal (details|information|profile))$/],
];

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE = `(?:${MONTH}\\s*[''’]?\\d{2,4}|\\d{1,2}[/.-]\\d{2,4}|(?:19|20)\\d{2})`;
const RANGE = new RegExp(`(${DATE})\\s*(?:[-–—]|to)\\s*(${DATE}|present|current|now|till date|ongoing)`, 'i');
const SINGLE = new RegExp(`(?:^|[\\s(|,])(${DATE})\\s*$`, 'i');
const BULLET = /^[•●▪◦‣∙·○■□➢►▶✓✔*-]\s*/;
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE = /(\+?\d[\d\s-]{8,}\d)/;
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s|,]+/i;
const URL_RE = /(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|behance\.net|[\w-]+\.(?:dev|io|me|in|com|net|org))(?:\/[^\s|,]*)?/i;
const DEGREE = /\b(b\.?\s?tech|b\.?\s?e\b|bachelor|master|m\.?\s?tech|m\.?\s?sc|b\.?\s?sc|b\.?\s?com|m\.?\s?com|mba|bba|bca|mca|ph\.?\s?d|diploma|class (x|xii|10|12)|higher secondary|secondary|ssc|hsc|cbse|icse|b\.?\s?a\b|m\.?\s?a\b|pgdm|degree)/i;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const headingKey = (line: string): Bucket | null => {
  const t = clean(line).replace(/[:：]$/, '').toLowerCase();
  if (t.length > 40 || t.split(' ').length > 5) return null;
  for (const [k, re] of HEADINGS) if (re.test(t)) return k;
  return null;
};
const split = (s: string) =>
  s
    .split(/\s*[,|•·;●▪]\s*|\s{3,}|\t/)
    .map(clean)
    .filter(Boolean);
const titleCase = (s: string) => (s === s.toUpperCase() && /[A-Z]{3}/.test(s) ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);

interface Entry {
  head: string[];
  start: string;
  end: string;
  bullets: string[];
}

/** Group a section's lines into dated entries with bullets. */
function entries(lines: string[], mode: 'jobs' | 'education' | 'projects' = 'jobs'): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null;
  const hasDate = (s: string) => RANGE.test(s) || SINGLE.test(s);
  const startNew = () => (cur = { head: [], start: '', end: '', bullets: [] }) && out.push(cur);

  lines.forEach((raw, i) => {
    const isBullet = BULLET.test(raw);
    let line = clean(raw.replace(BULLET, ''));
    if (!line) return;
    if (!isBullet) {
      const range = line.match(RANGE);
      const single = range ? null : line.match(SINGLE);
      const dated = range || single;
      const next = lines[i + 1] ?? '';
      // A short line right above a dated line is that entry's heading ("Role | Company" then dates).
      const nextDated = !dated && line.split(' ').length <= 8 && !BULLET.test(next) && hasDate(next) && clean(next.replace(RANGE, '')).split(' ').length <= 3;
      const inBullets = !!cur?.bullets.length;
      const continuation = inBullets && /^[a-z(&]/.test(line);
      if (continuation) {
        cur!.bullets[cur!.bullets.length - 1] += ' ' + line;
        return;
      }
      const curDated = !!(cur && (cur.start || cur.end));
      const detail = /cgpa|gpa|percentage|%|grade|marks/i.test(line);
      const words = line.split(' ').length;
      // Projects: a short line after bullets is the next project's name.
      const nextProject = mode === 'projects' && inBullets && !dated && words <= 7 && !/[.;]$/.test(line);
      const nextDegree = mode === 'education' && !!cur?.head.some((h) => DEGREE.test(h)) && DEGREE.test(line) && !detail;
      if (!cur || nextProject || nextDegree || (inBullets && (dated || nextDated)) || (curDated && cur.head.length && (dated || (nextDated && !detail)))) startNew();
      // Many PDFs draw bullet markers as shapes, so a sentence after the heading is a bullet too.
      const sentence = mode !== 'education' && !!cur!.head.length && !dated && !nextDated && words >= 6;
      if ((inBullets || sentence) && !dated && !nextDated && !nextProject) {
        cur!.bullets.push(line);
        return;
      }
      if (dated) {
        if (range) [cur!.start, cur!.end] = [clean(range[1]), titleCase(clean(range[2]))];
        else cur!.end = clean(single![1]);
        line = clean(line.replace(range ? range[0] : single![1], '').replace(/[(|,–—-]\s*\)?\s*$|^\s*[|,–—-]\s*/g, ''));
        if (!line) return;
      }
      cur!.head.push(line);
      return;
    }
    if (!cur) startNew();
    cur!.bullets.push(line);
  });
  return out.filter((e) => e.head.length || e.bullets.length);
}

/** "Role, Company, City" / "Role at Company" / "Role | Company" / two lines. */
function roleCompany(head: string[]): { role: string; company: string; location: string } {
  const [a = '', b = '', c = ''] = head;
  const parts = a.split(/\s+(?:at|@)\s+|\s*[|,–—]\s*|\s+-\s+/).map(clean).filter(Boolean);
  if (parts.length >= 2 && !b) return { role: parts[0], company: parts[1], location: parts.slice(2).join(', ') };
  if (parts.length >= 2) return { role: parts[0], company: parts[1], location: parts[2] ?? b };
  return { role: a, company: b, location: c };
}

export function parseResumeText(text: string): Resume {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/ /g, ' ').trimEnd())
    .filter((l) => clean(l));

  const sections = new Map<Bucket, string[]>();
  const header: string[] = [];
  const customs: { title: string; lines: string[] }[] = [];
  let bucket: Bucket | 'header' = 'header';
  let custom: { title: string; lines: string[] } | null = null;

  for (const l of lines) {
    const key = headingKey(l);
    if (key) {
      bucket = key;
      custom = null;
      if (!sections.has(key)) sections.set(key, []);
      continue;
    }
    // An all-caps short line after the header that is not a known heading: keep it as a custom section.
    const t = clean(l);
    if (bucket !== 'header' && t.length <= 30 && t === t.toUpperCase() && /^[A-Z][A-Z &/]+$/.test(t) && t.split(' ').length <= 4) {
      custom = { title: titleCase(t), lines: [] };
      customs.push(custom);
      continue;
    }
    if (custom) custom.lines.push(l);
    else if (bucket === 'header') header.push(l);
    else sections.get(bucket)!.push(l);
  }

  // Contact block
  const headText = header.join(' | ');
  const email = headText.match(EMAIL)?.[0] ?? text.match(EMAIL)?.[0] ?? '';
  const linkedin = (headText.match(LINKEDIN)?.[0] ?? text.match(LINKEDIN)?.[0] ?? '').replace(/^https?:\/\/(www\.)?/, '');
  const phone = clean(headText.replace(LINKEDIN, '').match(PHONE)?.[1] ?? '');
  const website = (headText.replace(LINKEDIN, '').replace(EMAIL, '').match(URL_RE)?.[0] ?? '').replace(/^https?:\/\/(www\.)?/, '');
  const plain = header.map(clean).filter((l) => !EMAIL.test(l) && !PHONE.test(l) && !LINKEDIN.test(l));
  const name = titleCase(plain.find((l) => l.split(' ').length <= 5 && !/\d/.test(l)) ?? '');
  const rest = plain.filter((l) => l !== name && clean(l) !== name.toUpperCase());
  const title = rest.find((l) => l.length <= 60 && !/\d/.test(l) && !l.includes(',')) ?? '';
  const location =
    headText
      .split(/\s*[|•·;●▪]\s*|\s{3,}|\t/)
      .map(clean)
      .map((p) => p.replace(/^(address|location)\s*:\s*/i, ''))
      .find((p) => /^[A-Za-z .]+,\s*[A-Za-z .]+$/.test(p) && p.length <= 40 && p !== name) ??
    '';
  const leftover = rest.filter((l) => l !== title && !l.includes(location || '\u0000') && l.split(' ').length > 8);

  const get = (k: Bucket) => sections.get(k) ?? [];
  const bulletsOf = (k: Bucket) => get(k).map((l) => clean(l.replace(BULLET, ''))).filter(Boolean);
  const csvOf = (k: Bucket) =>
    [
      ...new Set(
        get(k)
          .flatMap((l) => split(l.replace(BULLET, '').replace(/^[^:]{2,30}:\s*/, '')))
          .filter((x) => x.length <= 40),
      ),
    ].join(', ');

  const jobs = (k: Bucket) =>
    entries(get(k)).map((e) => ({ ...roleCompany(e.head), start: e.start, end: e.end, bullets: e.bullets.join('\n') }));

  const INSTITUTION = /universit|institute|college|school|academy|iit|nit|iiit|iim|bits|vit\b|vidyalaya|polytechnic/i;
  const education = entries(get('education'), 'education').map((e) => {
    const deg = e.head.find((h) => DEGREE.test(h)) ?? e.head[0] ?? '';
    const others = e.head.filter((h) => h !== deg);
    const parts = deg.split(/\s*[|,–—]\s*|\s+-\s+/).map(clean).filter(Boolean);
    // "B.Tech, Computer Science, NIT Calicut, Kozhikode": degree up to the institution, then the institution.
    const at = parts.findIndex((x, i) => i > 0 && INSTITUTION.test(x));
    const degree = (at > 0 ? parts.slice(0, at) : parts.slice(0, 1)).join(', ');
    const inline = at > 0 ? parts.slice(at).join(', ') : parts.slice(1).join(', ');
    const named = others.find((h) => INSTITUTION.test(h));
    const school = (INSTITUTION.test(inline) ? inline : named) || inline || others.find((h) => !/cgpa|gpa|percentage|%|grade/i.test(h)) || '';
    const details = [...others.filter((h) => h !== school), ...e.bullets].join('; ');
    return { degree, school, location: '', start: e.start, end: e.end, details };
  });

  const projects = entries(get('projects'), 'projects').map((e) => {
    const head = e.head.join(' | ');
    const link = (head.match(URL_RE)?.[0] ?? '').replace(/^https?:\/\/(www\.)?/, '');
    const name = clean(head.replace(URL_RE, '').split(/\s*[|–—]\s*/)[0] ?? '') || e.bullets.shift() || '';
    return { name, link, bullets: e.bullets.join('\n') };
  });

  const summary = [...get('summary'), ...(sections.has('summary') ? [] : leftover)].map(clean).join(' ');

  return normalizeResume({
    contact: { name, title, email, phone, location, linkedin, website },
    summary,
    experience: jobs('experience'),
    education,
    skills: csvOf('skills'),
    projects,
    certifications: bulletsOf('certifications').join('\n'),
    awards: bulletsOf('awards').join('\n'),
    volunteering: jobs('volunteering'),
    languages: csvOf('languages').replace(/\s*\([^)]*\)/g, ''),
    interests: csvOf('interests'),
    custom: customs
      .filter((c) => c.lines.length)
      .slice(0, 5)
      .map((c) => ({ title: c.title, body: c.lines.map((l) => clean(l.replace(BULLET, ''))).join('\n') })),
  });
}
