import puppeteer from '@cloudflare/puppeteer';
import { RESUME_CSS } from '../../src/shared/resumeCss';
import { resumeDocument } from '../../src/shared/document';
import { fileName } from '../../src/shared/render';
import { normalizeResume } from '../../src/shared/resume';
import { verifyUnlock } from '../_lib/crypto';
import { fail, paymentsConfigured, readJson, type Env } from '../_lib/env';

/**
 * Render the paid resume to a text-based PDF with headless Chrome (Cloudflare
 * Browser Rendering), from the same HTML and CSS as the live preview.
 * Requires an unlock token for this resume id.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!paymentsConfigured(env)) return fail(503, 'payments_not_configured');
  if (!env.BROWSER) return fail(501, 'server_pdf_unavailable');
  const b = await readJson(request, 64_000);
  const unlock = await verifyUnlock(b?.token, env.UNLOCK_SECRET!);
  if (!unlock || unlock.rid !== b?.rid) return fail(402, 'payment_required');

  const resume = normalizeResume(b?.resume);
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setContent(resumeDocument(resume, RESUME_CSS, new URL(request.url).origin), { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return new Response(pdf, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${fileName(resume)}"`,
        'cache-control': 'no-store',
      },
    });
  } finally {
    await browser.close();
  }
};
