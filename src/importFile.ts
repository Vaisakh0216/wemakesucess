/**
 * Read the text of a resume file in the browser. Nothing is uploaded: PDFs go
 * through pdf.js (loaded only when needed) and Word files are unzipped with the
 * browser's own DecompressionStream.
 */

export const IMPORT_ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
const MAX_BYTES = 10 * 1024 * 1024;

export async function fileToText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('That file is over 10 MB. Please choose a smaller one.');
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  let text: string;
  if (name.endsWith('.pdf') || file.type === 'application/pdf') text = await pdfText(buf);
  else if (name.endsWith('.docx')) text = await docxText(buf);
  else if (name.endsWith('.doc')) throw new Error('Old .doc files cannot be read. Save it as .docx or PDF in Word and try again.');
  else text = new TextDecoder().decode(buf);
  if (text.replace(/\s/g, '').length < 40)
    throw new Error('No text found in that file. If it is a scanned image, please type your details in or use a text-based PDF.');
  return text;
}

/* ---------- PDF ---------- */

async function pdfText(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 10); n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // Rebuild lines from positioned text: group by baseline, then order left to right.
    type Piece = { x: number; y: number; w: number; s: string; h: number };
    const pieces: Piece[] = [];
    for (const it of content.items) {
      if (!('str' in it) || !it.str) continue;
      pieces.push({ x: it.transform[4], y: it.transform[5], w: it.width, s: it.str, h: Math.abs(it.transform[3]) || 10 });
    }
    pieces.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Piece[][] = [];
    for (const p of pieces) {
      const line = lines.find((l) => Math.abs(l[0].y - p.y) < Math.max(2, p.h * 0.35));
      if (line) line.push(p);
      else lines.push([p]);
    }
    lines.sort((a, b) => b[0].y - a[0].y);
    pages.push(
      lines
        .map((l) => {
          l.sort((a, b) => a.x - b.x);
          let out = '';
          let end = -Infinity;
          for (const p of l) {
            const gap = p.x - end;
            // A wide gap usually separates a title from a right-aligned date.
            out += out && gap > p.h * 2 ? '   ' : out && gap > p.h * 0.15 && !/\s$/.test(out) ? ' ' : '';
            out += p.s;
            end = p.x + p.w;
          }
          return out;
        })
        .join('\n'),
    );
  }
  await task.destroy();
  return pages.join('\n');
}

/* ---------- Word (.docx) ---------- */

async function docxText(buf: ArrayBuffer): Promise<string> {
  const xml = await unzipEntry(new Uint8Array(buf), 'word/document.xml');
  if (!xml) throw new Error('That Word file could not be read. Try saving it as PDF.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const out: string[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(W, 'p'))) {
    let line = '';
    p.querySelectorAll('*').forEach((el) => {
      if (el.namespaceURI !== W) return;
      if (el.localName === 't') line += el.textContent ?? '';
      else if (el.localName === 'tab') line += '   ';
      else if (el.localName === 'br') line += '\n';
    });
    const style = p.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') ?? '';
    const listItem = p.getElementsByTagNameNS(W, 'numPr').length > 0 || /list|bullet/i.test(style);
    if (line.trim()) out.push((listItem ? '• ' : '') + line);
  }
  return out.join('\n');
}

/** Minimal ZIP reader: finds one entry via the central directory and inflates it. */
async function unzipEntry(zip: Uint8Array, wanted: string): Promise<string | null> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count && p + 46 <= zip.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) return null;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = zip.subarray(start, start + size);
      if (method === 0) return dec.decode(data);
      if (method !== 8) return null;
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
