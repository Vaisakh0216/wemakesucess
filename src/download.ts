import { RESUME_CSS } from './shared/resumeCss';
import { resumeDocument } from './shared/document';
import { fileName } from './shared/render';
import type { Resume } from './shared/resume';

/**
 * Test-mode download: prints the resume from a hidden frame so the browser's
 * "Save as PDF" produces a text-based PDF. The paid flow replaces this with a
 * server-rendered PDF that is only issued after a verified payment.
 */
export function printResume(r: Resume): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(resumeDocument(r, RESUME_CSS, location.origin).replace(/<title>.*?<\/title>/, `<title>${fileName(r).replace(/\.pdf$/, '')}</title>`));
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  const fonts = (doc as Document).fonts;
  if (fonts?.ready) fonts.ready.then(() => setTimeout(go, 50));
  else setTimeout(go, 500);
}
