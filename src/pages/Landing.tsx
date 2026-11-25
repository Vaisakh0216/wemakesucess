import { SiteFooter, SiteHeader } from '../components/Site';
import { ResumeThumb } from '../components/ResumeThumb';
import { TemplateGallery } from '../components/TemplateGallery';
import { coverPriceLabel, priceLabel } from '../config';
import { createDoc } from '../docs';
import { Link, navigate } from '../router';
import { SAMPLE } from '../shared/resume';

const FAQ: [string, string][] = [
  [
    'What does ATS-friendly mean?',
    'Most companies run applications through an applicant tracking system (ATS) that reads your resume as text. Every wemakesucess template is a single column with standard section headings and real, selectable text, so the system reads it in the right order. No tables, text boxes or images that scramble the result.',
  ],
  [
    'Is it really free?',
    `Building, editing and previewing are free, with no sign-up and no card. You pay ${priceLabel} once only when you want the PDF of a resume. After that, download it as many times as you like, including after edits and template changes.`,
  ],
  [
    'Is this a subscription?',
    'No. One payment per resume, nothing renews, nothing to cancel.',
  ],
  [
    'Where is my resume stored?',
    'In your own browser, in My Documents. It is sent to our server only to create your PDF and is not kept. Keep your payment order id: it restores your purchase on another device.',
  ],
  [
    'Can I use it for Naukri, LinkedIn and company portals?',
    'Yes. Upload the PDF, or use “Copy plain text” to paste your resume into portal forms that ask you to type it in.',
  ],
  [
    'How do I pay?',
    'UPI, cards, netbanking or wallets through Razorpay. We never see your card or bank details.',
  ],
];

export function Landing() {
  const start = () => navigate(`/edit/${createDoc().id}`);
  return (
    <div className="site">
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Free resume builder for India</p>
          <h1>
            Get past the resume bots. <em>Get to the interview.</em>
          </h1>
          <p className="lead">
            Build an ATS-friendly resume with guided steps, a live preview and a 10-point ATS check. Free to build. One
            payment of {priceLabel} to download the PDF.
          </p>
          <div className="cta-row">
            <button className="btn primary big" type="button" onClick={start}>
              Create my resume →
            </button>
            <Link href="/templates" className="btn big">
              Browse templates
            </Link>
          </div>
          <p className="muted small">No sign-up. No card until you download.</p>
          <ul className="facts">
            <li>
              <b>4</b> ATS-safe templates
            </li>
            <li>
              <b>{priceLabel}</b> one-time, per resume
            </li>
            <li>
              <b>0</b> subscriptions
            </li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          <ResumeThumb resume={SAMPLE} max={380} />
          <div className="float-card score-card">
            <span className="big-num">100</span>
            <span>
              ATS check
              <br />
              <small>10 of 10 passed</small>
            </span>
          </div>
          <div className="float-card tools-card">
            <span>✓ Real, selectable text</span>
            <span>✓ Standard headings</span>
            <span>✓ Single column</span>
          </div>
        </div>
      </section>

      <section className="band" id="templates">
        <h2>Pick a template to start</h2>
        <p className="lead">Every template is ATS-friendly. Switch any time; your content stays.</p>
        <TemplateGallery />
      </section>

      <section className="band alt" id="how">
        <h2>Your resume in 3 steps</h2>
        <ol className="steps3">
          <li>
            <span className="num">1</span>
            <h3>Pick a template</h3>
            <p>Choose a layout, colour and font. Change your mind later without retyping anything.</p>
          </li>
          <li>
            <span className="num">2</span>
            <h3>Fill in guided sections</h3>
            <p>Tips for each section, a live A4 preview, and an ATS check that tells you exactly what to fix.</p>
          </li>
          <li>
            <span className="num">3</span>
            <h3>Download and apply</h3>
            <p>Pay {priceLabel} once for a clean PDF, or copy plain text for job portal forms.</p>
          </li>
        </ol>
      </section>

      <section className="band" id="why">
        <h2>What a hiring system actually reads</h2>
        <p className="lead">Fancy layouts look good to people but often come out scrambled when software reads them.</p>
        <div className="compare">
          <div className="cmp bad">
            <h3>Typical designed resume</h3>
            <pre>{`SKILLS  WORK EXPERIENCE  Excel
2019 – Sales Manager  ★★★★☆
Communication  ABC Pvt Ltd Pune
[image] Leadership  ★★★☆☆`}</pre>
            <p>Two columns, tables and skill bars get read across the page and mixed together.</p>
          </div>
          <div className="cmp good">
            <h3>wemakesucess resume</h3>
            <pre>{`ANANYA KRISHNAN
Senior Software Engineer
EXPERIENCE
Senior Software Engineer, Kiranakart
- Led a team of 5 to rebuild checkout…`}</pre>
            <p>One column and standard headings, read top to bottom exactly as you wrote it.</p>
          </div>
        </div>
      </section>

      <section className="band alt" id="pricing">
        <h2>Simple pricing</h2>
        <div className="plans">
          <div className="plan">
            <h3>Build</h3>
            <p className="price-big">Free</p>
            <ul>
              <li>All templates, colours and fonts</li>
              <li>Unlimited resumes and cover letters</li>
              <li>Live preview and ATS check</li>
              <li>Import your old resume (PDF or Word)</li>
              <li>Copy as plain text</li>
            </ul>
            <button className="btn big" type="button" onClick={start}>
              Start free
            </button>
          </div>
          <div className="plan featured">
            <h3>Download</h3>
            <p className="price-big">
              {priceLabel} <small>per resume, once</small>
            </p>
            <ul>
              <li>Text-based PDF that ATS can read</li>
              <li>Unlimited re-downloads of that resume</li>
              <li>Edit and switch templates any time</li>
              <li>UPI, cards, netbanking, wallets</li>
              <li>Matching cover letter: {coverPriceLabel} each</li>
            </ul>
            <button className="btn primary big" type="button" onClick={start}>
              Create my resume →
            </button>
          </div>
        </div>
      </section>

      <section className="band" id="faq">
        <h2>Questions</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="band cta-band">
        <h2>Your next interview starts with a resume that gets read.</h2>
        <button className="btn primary big" type="button" onClick={start}>
          Create my resume →
        </button>
      </section>

      <SiteFooter />
    </div>
  );
}

export function TemplatesPage() {
  return (
    <div className="site">
      <SiteHeader />
      <section className="band">
        <h1>Resume templates</h1>
        <p className="lead">Every template is single-column and ATS-friendly. Pick one; you can switch any time.</p>
        <TemplateGallery />
      </section>
      <SiteFooter />
    </div>
  );
}
