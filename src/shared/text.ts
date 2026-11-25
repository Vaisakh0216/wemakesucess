export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Split multi-line input into clean bullet lines, stripping typed bullet characters. */
export const lines = (s: string | undefined): string[] =>
  String(s || '')
    .split('\n')
    .map((x) => x.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean);

/** Split comma or newline separated input. */
export const csv = (s: string | undefined): string[] =>
  String(s || '')
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
