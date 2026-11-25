import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { handlePdf, WAIT_FOR_FONTS } from '../server/handlers.js';
import { env } from './_env.js';

async function render(html: string): Promise<Uint8Array> {
  // CHROME_PATH lets local runs use an installed Chrome; on Vercel the bundled Chromium is used.
  const local = process.env.CHROME_PATH;
  const browser = await puppeteer.launch({
    executablePath: local || (await chromium.executablePath()),
    args: local ? ['--no-sandbox', '--headless=new'] : chromium.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(WAIT_FOR_FONTS);
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}

export function POST(request: Request): Promise<Response> {
  return handlePdf(request, env(), render);
}
