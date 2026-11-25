import type { Resume } from './resume.js';
import { coverHTML, type CoverLetter } from './cover.js';
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
<style>${fontFaces(origin)}\n${css}\n@page{size:A4;margin:${r.layout.margin}mm ${r.layout.margin + 1}mm}</style></head>
<body><div class="sheet">${resumeHTML(r)}</div></body></html>`;
}

export function coverDocument(c: CoverLetter, css: string, origin = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(c.contact.name ? `${c.contact.name} cover letter` : 'Cover letter')}</title>
<style>${fontFaces(origin)}\n${css}\n@page{size:A4;margin:${c.layout.margin}mm ${c.layout.margin + 2}mm}</style></head>
<body><div class="sheet">${coverHTML(c)}</div></body></html>`;
}
