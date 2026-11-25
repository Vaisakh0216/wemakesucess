import { describe, expect, it } from 'vitest';
import { parseResumeText } from '../src/shared/parse';
import { plainText } from '../src/shared/render';
import { SAMPLE } from '../src/shared/resume';

const INDIAN = `RAHUL SHARMA
Data Analyst
rahul.sharma@example.com | +91 98765 43210 | Pune, Maharashtra | linkedin.com/in/rahul-sharma
CAREER OBJECTIVE
Detail-oriented analyst with 3 years of experience turning sales data into decisions.
WORK EXPERIENCE
Data Analyst, Tata Consultancy Services, Pune Jun 2022 – Present
• Built Power BI dashboards used by 40 regional managers
• Automated weekly reporting in Python, saving 6 hours a week for the
team of analysts
Junior Analyst | Infosys
Jul 2020 - May 2022
• Cleaned and merged CRM data for 2 lakh customers
EDUCATION
B.Tech in Computer Science, VIT Vellore 2016 – 2020
CGPA: 8.4/10
Class XII, CBSE
Delhi Public School, Pune 2016
TECHNICAL SKILLS
Languages: Python, SQL
Tools: Power BI, Excel, Tableau
CERTIFICATIONS
• Google Data Analytics Certificate
LANGUAGES KNOWN
English, Hindi, Marathi
HOBBIES
Cricket, Reading
DECLARATION
I hereby declare that the above information is true.`;

describe('importing an existing resume', () => {
  it('reads a typical Indian resume', () => {
    const r = parseResumeText(INDIAN);
    expect(r.contact).toMatchObject({
      name: 'Rahul Sharma',
      title: 'Data Analyst',
      email: 'rahul.sharma@example.com',
      phone: '+91 98765 43210',
      location: 'Pune, Maharashtra',
      linkedin: 'linkedin.com/in/rahul-sharma',
    });
    expect(r.summary).toMatch(/^Detail-oriented analyst/);
    expect(r.experience).toHaveLength(2);
    expect(r.experience[0]).toMatchObject({ role: 'Data Analyst', company: 'Tata Consultancy Services', start: 'Jun 2022', end: 'Present' });
    expect(r.experience[0].bullets.split('\n')).toEqual([
      'Built Power BI dashboards used by 40 regional managers',
      'Automated weekly reporting in Python, saving 6 hours a week for the team of analysts',
    ]);
    expect(r.experience[1]).toMatchObject({ role: 'Junior Analyst', company: 'Infosys', start: 'Jul 2020', end: 'May 2022' });
    expect(r.education[0]).toMatchObject({ degree: 'B.Tech in Computer Science', school: 'VIT Vellore', start: '2016', end: '2020' });
    expect(r.education[0].details).toContain('CGPA');
    expect(r.education).toHaveLength(2);
    expect(r.education[1]).toMatchObject({ degree: 'Class XII', school: 'Delhi Public School, Pune', end: '2016' });
    expect(r.skills).toBe('Python, SQL, Power BI, Excel, Tableau');
    expect(r.certifications).toBe('Google Data Analytics Certificate');
    expect(r.languages).toBe('English, Hindi, Marathi');
    expect(r.interests).toBe('Cricket, Reading');
    expect(JSON.stringify(r)).not.toContain('hereby declare');
  });

  it('round-trips our own plain-text export closely', () => {
    const r = parseResumeText(plainText(SAMPLE));
    expect(r.contact.name).toBe(SAMPLE.contact.name);
    expect(r.contact.email).toBe(SAMPLE.contact.email);
    expect(r.summary).toBe(SAMPLE.summary.trim());
    expect(r.experience.map((e) => e.role)).toEqual(SAMPLE.experience.map((e) => e.role));
    expect(r.experience.map((e) => e.company)).toEqual(SAMPLE.experience.map((e) => e.company));
    expect(r.experience[0].bullets).toBe(SAMPLE.experience[0].bullets);
    expect(r.skills).toBe(SAMPLE.skills);
  });

  it('reads PDF text where bullet markers are drawn, not typed', () => {
    const r = parseResumeText(`Asha Menon
Product Designer
asha@example.com | +91 90000 00000
EXPERIENCE
Product Designer, Swiggy, Bengaluru   Apr 2022 – Present
Redesigned the checkout flow, lifting completed orders by 7%
Ran 30 usability sessions with restaurant partners across 4 cities
Designer, Zoho, Chennai   Jul 2019 – Mar 2022
Built the first shared design system used by 12 product teams
PROJECTS
Ration card finder   github.com/asha/ration
Mapped 2,000 fair price shops from public data for an open map
Typing tutor for Malayalam
Taught 500 students touch typing in their first language`);
    expect(r.experience.map((e) => [e.role, e.company, e.bullets.split('\n').length])).toEqual([
      ['Product Designer', 'Swiggy', 2],
      ['Designer', 'Zoho', 1],
    ]);
    expect(r.projects.map((p) => [p.name, p.link])).toEqual([
      ['Ration card finder', 'github.com/asha/ration'],
      ['Typing tutor for Malayalam', ''],
    ]);
  });

  it('never throws on junk', () => {
    for (const t of ['', '\n\n', 'just one line', '•\n•\n2020 - 2021', 'EXPERIENCE\n- \n2020']) expect(() => parseResumeText(t)).not.toThrow();
  });
});
