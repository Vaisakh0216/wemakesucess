import type { Resume } from './resume.js';
import { resumeHTML } from './render.js';
import { esc } from './text.js';
import { fontFaces } from './fonts.js';

/**
 * A complete standalone HTML document for one resume, used for PDF rendering.
 * `origin` is where /fonts is served from (the site origin when rendering on the server).
 */
export function resumeDocument(r: Resume, css: string, origin = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(r.contact.name || 'Resume')}</title>
<style>${fontFaces(origin)}\n${css}</style></head>
<body><div class="sheet">${resumeHTML(r)}</div></body></html>`;
}
