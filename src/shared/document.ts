import type { Resume } from './resume';
import { resumeHTML } from './render';
import { esc } from './text';
import { fontFaces } from './fonts';

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
