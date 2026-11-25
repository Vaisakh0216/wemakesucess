/** Resume data model, shared by the web app and the server-side PDF renderer. */

export type TemplateId = 'modern' | 'classic' | 'compact' | 'executive';
export type FontId = 'sans' | 'serif' | 'plex';

export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
}
export interface Experience {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  /** One achievement per line. */
  bullets: string;
}
export interface Education {
  degree: string;
  school: string;
  location: string;
  start: string;
  end: string;
  details: string;
}
export interface Project {
  name: string;
  link: string;
  bullets: string;
}

export interface Resume {
  template: TemplateId;
  accent: string;
  font: FontId;
  contact: Contact;
  summary: string;
  experience: Experience[];
  education: Education[];
  /** Comma or newline separated. */
  skills: string;
  projects: Project[];
  /** One per line. */
  certifications: string;
  /** Comma separated. */
  languages: string;
}

export type ListKey = 'experience' | 'education' | 'projects';

export const TEMPLATES: { id: TemplateId; name: string; desc: string; font: FontId; tags: string[] }[] = [
  { id: 'modern', name: 'Modern', desc: 'Colour headings, clean sans', font: 'sans', tags: ['Modern', 'Simple', 'Graduate'] },
  { id: 'classic', name: 'Classic', desc: 'Centred, traditional rules', font: 'serif', tags: ['Traditional', 'Professional'] },
  { id: 'compact', name: 'Compact', desc: 'Dense, fits one page', font: 'plex', tags: ['One-page', 'Student', 'Simple'] },
  { id: 'executive', name: 'Executive', desc: 'Senior roles, double rule', font: 'serif', tags: ['Professional', 'Senior'] },
];

export const TEMPLATE_FILTERS = ['All', 'Modern', 'Simple', 'Professional', 'Traditional', 'One-page', 'Student', 'Graduate', 'Senior'];

export const ACCENTS = ['#1f3a68', '#0f6b6b', '#7a2338', '#2f2f2f', '#3b3f99', '#8a4b0f'];

export const FONTS: { id: FontId; name: string }[] = [
  { id: 'sans', name: 'Source Sans' },
  { id: 'serif', name: 'Source Serif' },
  { id: 'plex', name: 'IBM Plex' },
];

export const BLANK: { experience: Experience; education: Education; projects: Project } = {
  experience: { role: '', company: '', location: '', start: '', end: '', bullets: '' },
  education: { degree: '', school: '', location: '', start: '', end: '', details: '' },
  projects: { name: '', link: '', bullets: '' },
};

export const SAMPLE: Resume = {
  template: 'modern',
  accent: '#1f3a68',
  font: 'sans',
  contact: {
    name: 'Ananya Krishnan',
    title: 'Senior Software Engineer',
    email: 'ananya.k@example.com',
    phone: '+91 98450 12345',
    location: 'Bengaluru, Karnataka',
    linkedin: 'linkedin.com/in/ananya-k-example',
    website: '',
  },
  summary:
    'Backend engineer with 6 years of experience building payment and logistics platforms in Java and Go. Led the rebuild of a checkout service handling 2M orders a month and cut p95 latency by 40%. Looking for a senior or lead role in fintech.',
  experience: [
    {
      role: 'Senior Software Engineer',
      company: 'Kiranakart Technologies',
      location: 'Bengaluru',
      start: 'Apr 2022',
      end: 'Present',
      bullets:
        'Led a team of 5 to rebuild the checkout service in Go, reducing p95 latency from 820 ms to 490 ms\nDesigned UPI and card payment retries that recovered ₹1.2 Cr in failed orders per quarter\nIntroduced contract testing across 14 services, cutting release rollbacks by 60%',
    },
    {
      role: 'Software Engineer',
      company: 'Routewise Logistics',
      location: 'Pune',
      start: 'Jul 2019',
      end: 'Mar 2022',
      bullets:
        'Built a route-optimisation API in Java and Spring Boot used by 3,000 delivery partners daily\nMigrated order data from MySQL to PostgreSQL with zero downtime\nMentored 4 interns, 3 of whom joined full time',
    },
  ],
  education: [
    {
      degree: 'B.Tech, Computer Science and Engineering',
      school: 'National Institute of Technology, Calicut',
      location: 'Kozhikode',
      start: '2015',
      end: '2019',
      details: 'CGPA 8.6 / 10',
    },
  ],
  skills:
    'Java, Go, Spring Boot, PostgreSQL, Redis, Kafka, AWS, Docker, Kubernetes, REST APIs, System Design, Payments (UPI, cards)',
  projects: [
    {
      name: 'Open-source GST invoice generator',
      link: 'github.com/example/gst-invoice',
      bullets: 'CLI and library that produces GST-compliant invoices; 900+ GitHub stars',
    },
  ],
  certifications: 'AWS Certified Solutions Architect – Associate (2023)',
  languages: 'English, Malayalam, Hindi, Kannada',
};

export const cloneResume = (r: Resume): Resume => JSON.parse(JSON.stringify(r));

const HEX = /^#[0-9a-f]{6}$/i;
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Coerce untrusted input (localStorage, request bodies) into a valid Resume.
 * Unknown fields are dropped and every string is length-capped.
 */
export function normalizeResume(input: unknown): Resume {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const c = (o.contact && typeof o.contact === 'object' ? o.contact : {}) as Record<string, unknown>;
  const list = <T extends object>(v: unknown, blank: T, max = 20): T[] =>
    (Array.isArray(v) ? v.slice(0, max) : []).map((x) => {
      const src = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
      const out = { ...blank } as Record<string, string>;
      for (const k of Object.keys(blank)) out[k] = str(src[k]);
      return out as T;
    });
  return {
    template: TEMPLATES.some((t) => t.id === o.template) ? o.template : 'modern',
    accent: typeof o.accent === 'string' && HEX.test(o.accent) ? o.accent : ACCENTS[0],
    font: FONTS.some((f) => f.id === o.font) ? o.font : 'sans',
    contact: {
      name: str(c.name, 200),
      title: str(c.title, 200),
      email: str(c.email, 200),
      phone: str(c.phone, 50),
      location: str(c.location, 200),
      linkedin: str(c.linkedin, 300),
      website: str(c.website, 300),
    },
    summary: str(o.summary),
    experience: list(o.experience, BLANK.experience),
    education: list(o.education, BLANK.education),
    skills: str(o.skills),
    projects: list(o.projects, BLANK.projects),
    certifications: str(o.certifications),
    languages: str(o.languages, 500),
  };
}
