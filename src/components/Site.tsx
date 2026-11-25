import { Link } from '../router';

export function SiteHeader() {
  return (
    <header className="site-top">
      <Link href="/" className="brand" aria-label="wemakesucess home">
        <span className="mark" aria-hidden="true">
          w
        </span>
        <span className="brand-name">wemakesucess</span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        <Link href="/templates">Templates</Link>
        <a href="/#how">How it works</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
      </nav>
      <span className="spacer" />
      <Link href="/app" className="btn primary">
        My Documents
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="foot-brand">
        <Link href="/" className="brand">
          <span className="mark" aria-hidden="true">
            w
          </span>
          <span className="brand-name">wemakesucess</span>
        </Link>
        <p>ATS-friendly resumes, built free. Download for ₹299, once.</p>
      </div>
      <div className="foot-cols">
        <div>
          <h4>Resume</h4>
          <Link href="/templates">Resume templates</Link>
          <Link href="/app">My Documents</Link>
          <a href="/#how">How to write a resume</a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="/#pricing">Pricing</a>
          <a href="/legal/contact.html">Contact</a>
          <a href="/#faq">FAQ</a>
        </div>
        <div>
          <h4>Legal</h4>
          <a href="/legal/terms.html">Terms</a>
          <a href="/legal/privacy.html">Privacy</a>
          <a href="/legal/refunds.html">Refunds</a>
          <a href="/legal/delivery.html">Delivery</a>
        </div>
      </div>
      <p className="copy">© {new Date().getFullYear()} wemakesucess</p>
    </footer>
  );
}
