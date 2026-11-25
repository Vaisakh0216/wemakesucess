import type { Resume } from './resume';
import { resumeHTML } from './render';
import { esc } from './text';
import { RESUME_FONTS_HREF } from './fonts';

/** A complete standalone HTML document for one resume, used for PDF rendering. */
export function resumeDocument(r: Resume, css: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(r.contact.name || 'Resume')}</title>
<link rel="stylesheet" href="${RESUME_FONTS_HREF}">
<style>${css}</style></head>
<body><div class="sheet">${resumeHTML(r)}</div></body></html>`;
}
