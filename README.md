# wemakesucess

ATS-friendly resume builder for India. Build and preview for free; download a text-based PDF for a one-time ₹299.

## What's here

- **Landing page** (`/`): hero, template gallery with filters, 3 steps, ATS explainer, pricing, FAQ.
- **Templates** (`/templates`): live previews of every template; picking one opens the editor.
- **My Documents** (`/app`): any number of resumes saved in the browser, with tags, sorting, rename, duplicate and delete. Each document has its own ₹299 unlock.
- **Editor** (`/edit/:id`): undo and redo (buttons, Ctrl+Z, Ctrl+Shift+Z), editable document name.

- **Guided editor** (Design, Contact, Summary, Experience, Education, Skills, Projects) with a live A4 preview.
- **Four single-column ATS templates**: Modern, Classic, Compact, Executive, with six accent colours and three fonts.
- **ATS check**: a 10-point readiness score with fixes.
- **Copy plain text** for pasting into job-portal forms.
- **Autosave** of the draft in the browser.
- **₹299 checkout** with Razorpay (UPI, cards, netbanking, wallets). One payment unlocks unlimited downloads of one resume.
- **Server-rendered PDF** with headless Chrome: real, selectable text with embedded TrueType fonts, identical to the preview.
- **Pay by UPI QR** (the default until Razorpay keys are added): checkout shows a QR code for `UPI_ID` with the amount filled in, plus a copyable UPI ID. See below.
- **Demo mode**: with no Razorpay keys and `UPI_ID=off`, checkout simulates a payment and downloads through the browser's Save as PDF.

## Stack

React + Vite + TypeScript. Hosted on **Vercel**: the app is static files, and the API is Vercel Functions in `api/`.

- `server/` holds the platform-neutral API handlers (Web `Request` in, `Response` out).
- `api/` is the thin Vercel layer; `api/pdf.ts` runs headless Chromium via `@sparticuz/chromium` + `puppeteer-core`.
- `functions/` is the same thin layer for Cloudflare Pages (PDF via Cloudflare Browser Rendering), kept so the app can move there later.
- Accounts and cloud-saved resumes come after launch.

## Cover letters

- **Where they live:** My Documents → Cover letters, or "Write a matching cover letter" on a resume card. A letter copies that resume's design and contact details. Its editor is at `/cover/:id`, and "Write it with AI" drafts the body from the linked resume and a pasted job description.
- **Price:** ₹99 per letter, unlimited re-downloads. The order notes say `pdf_unlock_one_cover_letter`, and the unlock token carries `p: "cover"`. `/api/pdf` only renders a cover letter with a cover token, and a resume with a resume token, so a ₹99 purchase cannot download a resume.

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

## Pay by UPI QR (until Razorpay is set up)

While the Razorpay keys are not set, checkout takes payment to a personal UPI ID: `UPI_ID` (defaults to the owner's ID in `server/env.ts`; set `UPI_ID=off` to turn it off) and `UPI_NAME` (the payee name, default "wemakesucess").

1. The checkout shows a `upi://pay` QR code with the exact amount and a note like `WMS3F2B8C1E resume`, the document's short reference. On a phone there is also an "Open my UPI app" button. The QR is drawn in the browser, so it costs nothing.
2. After paying, the customer types the 12-digit UPI reference (UTR) and the PDF unlocks at once.
3. `POST /api/upi` writes each claim to the server log as one JSON line with `"event":"upi_claim"`, the UTR, amount, reference, name and email. Search Vercel → Logs for `upi_claim` and match each UTR with the bank statement. With `UNLOCK_SECRET` set it also returns a signed unlock token, so server-made PDFs work.

A payment to a personal UPI ID cannot be checked automatically, so this trusts the reference the customer types. Someone could type a made-up 12-digit number and get the PDF. Adding the Razorpay keys switches checkout back to verified payments, and UPI unlocks already given keep working.

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

## Sign-in and saved documents (optional)

Without these settings the app works as before: documents live in the browser and the "Sign in" button is hidden.

1. Create a free project at [supabase.com](https://supabase.com) (region: Mumbai).
2. **SQL Editor:** run `supabase/schema.sql`. It creates the `documents` table with row-level security, so each user can read and write only their own rows.
3. **Authentication → URL Configuration:** set Site URL to your site (for example `https://wemakesucess.vercel.app`) and add `https://*.vercel.app/app` and `http://localhost:5173/app` to Redirect URLs.
4. **Email sign-in** works out of the box. The built-in mailer is rate-limited, so before launch add your own SMTP under Authentication → Emails. Resend's free tier is enough.
5. **Google:** create an OAuth client (Web application) in Google Cloud Console → APIs & Services → Credentials. Add the callback URL that Supabase shows under Authentication → Providers → Google, then paste the client id and secret there.
6. **Vercel → Settings → Environment Variables:** add `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Supabase → Project Settings → API. Both are public; the table's security policy protects the data.

How sync works (`src/cloud.ts`):

- Signing in uploads the documents already in the browser and downloads the ones in the account. For each document the newer copy wins.
- Edits are saved about 1.5 seconds after you stop typing.
- Purchases travel with their document. The unlock token is still checked by `/api/pdf`, so a token edited in the database is useless.
- Deleting a document marks it deleted, so other devices remove it too.
- Signing out saves pending changes, then clears that browser.

## AI writing help (optional)

The editor's AI buttons are **Generate with AI** and **Improve my summary** on the Summary step, **Suggest achievements** and **Improve these** on each job, and **Suggest skills** on the Skills step. They call `/api/ai` (`server/ai.ts`), which uses Claude with structured JSON output.

- **Who can use it:** signed-in users only. The daily limit (`AI_DAILY_LIMIT`, default 20 a day, reset at midnight India time) is counted in Supabase by `use_ai_credit` in `supabase/schema.sql`. Run the updated schema file.
- **Setup:** add `ANTHROPIC_API_KEY` in Vercel (console.anthropic.com → API keys). Set a monthly spend limit in the Anthropic Console as a hard cap.
- **Cost:** the default model is `claude-opus-5-5` at low effort, about ₹1 per generation. Set `AI_MODEL=claude-haiku-5-5` to cut that to about a twentieth.
- **No invented facts:** the prompt never invents employers, dates or numbers. It writes placeholders such as `[X%]` for the user to fill in.

## Develop

```sh
npm install
npm run dev        # UI only, http://localhost:5173 (demo checkout)
npm run dev:full   # UI + API via `vercel dev` (needs a Vercel login)
npm test           # unit tests (renderer, ATS check, payment endpoints)
npm run build      # type check + production build into dist/
```

For local API runs, set the three variables in `.env.local` (Vercel) or `.dev.vars` (Cloudflare); see `.dev.vars.example`. To render PDFs locally, set `CHROME_PATH` to an installed Chrome.

## Deploy on Vercel

1. vercel.com → Add New → Project → import this GitHub repository. Vercel reads `vercel.json` (Vite build, output `dist`); no other settings needed.
2. Project → Settings → Environment Variables, for Production and Preview:
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: start with Razorpay **test** keys.
   - `UNLOCK_SECRET`: a long random string, e.g. `openssl rand -hex 32`.
   Without them the site runs in demo mode (nothing charged). Redeploy after adding them.
3. Every push to `main` deploys to production; every pull request gets a preview URL.
4. Settings → Domains to add your own domain.

Notes:
- Vercel's free Hobby plan is for **non-commercial** use only. Once you take real payments, Vercel's terms require the Pro plan (about $20 a month), or move to Cloudflare Pages below, whose free plan allows commercial use.
- `api/pdf.ts` gets 1 GB memory and 30 s (see `vercel.json`); a PDF typically takes 1 to 3 s, longer on a cold start.
- Fonts in `public/fonts` are served with CORS headers because the PDF renderer loads them from a page with no origin.
- Changing `UNLOCK_SECRET` invalidates saved unlocks; customers can restore with their order id.

## Alternative: Cloudflare Pages

1. Workers & Pages → Create → Pages → Connect to Git → this repository. Preset **Vite**, build `npm run build`, output `dist`.
2. Settings → Variables and Secrets: the same three variables as above.
3. Settings → Bindings → **Browser Rendering** named `BROWSER` (declared in `wrangler.toml`).

Local run of the Cloudflare setup: `npm run dev:cloudflare`.
