# wemakesucess

ATS-friendly resume builder for India. Build and preview for free; download a text-based PDF for a one-time ₹299.

## What's here

- **Guided editor** (Design, Contact, Summary, Experience, Education, Skills, Projects) with a live A4 preview.
- **Four single-column ATS templates**: Modern, Classic, Compact, Executive, with six accent colours and three fonts.
- **ATS check**: a 10-point readiness score with fixes.
- **Copy plain text** for pasting into job-portal forms.
- **Autosave** of the draft in the browser.
- **₹299 checkout** with Razorpay (UPI, cards, netbanking, wallets). One payment unlocks unlimited downloads of one resume.
- **Server-rendered PDF** with headless Chrome (Cloudflare Browser Rendering): real, selectable text with embedded TrueType fonts, identical to the preview.
- **Demo mode**: with no Razorpay keys configured, checkout simulates a payment and downloads through the browser's Save as PDF.

## Stack

React + Vite + TypeScript, hosted as static files on Cloudflare Pages. The API runs as Cloudflare Pages Functions in `functions/api/`. Accounts and cloud-saved resumes (Supabase) come later.

## How payment works

The browser never decides that someone has paid.

1. Each resume has a random id (`rid`) stored in the browser.
2. `POST /api/order` creates a ₹299 Razorpay order with `rid` in the order notes. The price lives only on the server.
3. Razorpay Checkout collects the payment.
4. `POST /api/verify` checks Razorpay's HMAC signature with the key secret, checks the order is for this `rid` at full price, and returns an unlock token signed with `UNLOCK_SECRET`.
5. `POST /api/pdf` renders the PDF only for a valid token whose `rid` matches.
6. `POST /api/restore` re-issues a token from a paid order id, if the tab closed mid-payment or browser data was cleared.

Razorpay's order record is the purchase record, so there is no database to run yet.

`src/shared/` holds the framework-free core (data model, template renderer, ATS check, CSS). The browser preview and the server-side PDF renderer both use it, so the PDF always matches the preview.

## ATS rules every template must keep

- Single column, no tables, images or text boxes.
- Real text in reading order: name, headline, contact line, then standard section headings (Summary, Experience, Education, Skills, Projects, Certifications, Languages).
- Contact details in the body, never in a page header or footer.
- Templates differ only in CSS; `tests/render.test.ts` enforces identical markup.

## Policy pages

`public/legal/` has Terms, Privacy, Refunds, Delivery and Contact pages, which Razorpay checks during KYC. Before going live, replace the placeholders `{{BUSINESS_NAME}}`, `{{SUPPORT_EMAIL}}`, `{{BUSINESS_ADDRESS}}` and `{{JURISDICTION_CITY}}`:

```sh
grep -rl '{{' public/legal   # lists pages that still have placeholders
```

The privacy policy describes what the code does today (resume kept in the browser, sent to the server only to render the PDF). Update it when accounts or analytics are added.

## Develop

```sh
npm install
npm run dev        # UI only, http://localhost:5173 (demo checkout)
npm run dev:full   # UI + API via wrangler, http://localhost:8788
npm test           # unit tests (renderer, ATS check, payment endpoints)
npm run build      # type check + production build into dist/
```

For `dev:full` with Razorpay test keys, copy `.dev.vars.example` to `.dev.vars` and fill it in.

## Deploy (Cloudflare Pages, free tier)

1. In the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git → pick this repository.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Settings → Variables and Secrets (encrypted): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (start with Razorpay **test** keys), and `UNLOCK_SECRET` (a long random string, e.g. `openssl rand -hex 32`). Without them the site runs in demo mode.
4. Settings → Bindings → add **Browser Rendering** named `BROWSER` (also declared in `wrangler.toml`). Without it, paid downloads fall back to the browser's Save as PDF.
5. Every push to `main` deploys to production; every pull request gets its own preview URL.

Changing `UNLOCK_SECRET` invalidates saved unlocks; customers can restore with their order id.
