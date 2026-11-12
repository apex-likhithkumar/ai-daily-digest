/** Returns the URL only when it is http(s). Anything else (javascript:, data:, ...) must never reach an href. */
export function safeHttpUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined; // not a URL at all
  }
}
