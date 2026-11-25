import puppeteer from '@cloudflare/puppeteer';
import { handlePdf, WAIT_FOR_FONTS, type PdfRenderer } from '../../server/handlers.js';
import type { CfEnv } from '../_env.js';

/** PDF via Cloudflare Browser Rendering. */
export const onRequestPost: PagesFunction<CfEnv> = ({ request, env }) => {
  const render: PdfRenderer | null = env.BROWSER
    ? async (html) => {
        const browser = await puppeteer.launch(env.BROWSER!);
        try {
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'networkidle0' });
          await page.evaluate(WAIT_FOR_FONTS);
          return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
        } finally {
          await browser.close();
        }
      }
    : null;
  return handlePdf(request, env, render);
};
