export const SUMMARY_MAX_CHARS = 300;

/** Strip tags, decode the common entities, collapse whitespace, truncate. */
export function stripHtml(html: string, maxChars = SUMMARY_MAX_CHARS): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&') // last, so "&amp;lt;" is not double-decoded
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

export function toIso(value: string): string | null {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}
