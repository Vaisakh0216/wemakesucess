# wemakesucess

ATS-friendly resume builder for India. Build and preview for free; download a text-based PDF for a one-time ₹299.

## What's here

- **Guided editor** (Design, Contact, Summary, Experience, Education, Skills, Projects) with a live A4 preview.
- **Four single-column ATS templates**: Modern, Classic, Compact, Executive, with six accent colours and three fonts.
- **ATS check**: a 10-point readiness score with fixes.
- **Copy plain text** for pasting into job-portal forms.
- **Autosave** of the draft in the browser.
- **Checkout**: test mode for now (nothing is charged). Razorpay and server-rendered PDFs come next.

## Stack

React + Vite + TypeScript, hosted as static files on Cloudflare Pages. Payment, PDF and account APIs will run as Cloudflare Pages Functions, with Supabase for login and saved resumes. See the production plan for costs and phases.

`src/shared/` holds the framework-free core (data model, template renderer, ATS check, CSS). The browser preview and the server-side PDF renderer both use it, so the PDF always matches the preview.

## ATS rules every template must keep

- Single column, no tables, images or text boxes.
- Real text in reading order: name, headline, contact line, then standard section headings (Summary, Experience, Education, Skills, Projects, Certifications, Languages).
- Contact details in the body, never in a page header or footer.
- Templates differ only in CSS; `tests/render.test.ts` enforces identical markup.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # type check + production build into dist/
```

## Deploy (Cloudflare Pages, free tier)

1. In the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git → pick this repository.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Every push to `main` deploys to production; every pull request gets its own preview URL.
