import { createHash } from 'node:crypto';

const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'ref', 'ref_src', 'mc_cid', 'mc_eid', 'igshid']);
const ID_LENGTH = 16;

/** Throws on invalid URLs or non-http(s) protocols (so `javascript:` can never reach a link). */
export function canonicalUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  url.protocol = 'https:';
  url.hash = '';
  url.hostname = url.hostname.replace(/^www\./, '');

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !key.toLowerCase().startsWith('utm_') && !TRACKING_PARAMS.has(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [key, value] of kept) url.searchParams.append(key, value);

  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export function safeCanonicalUrl(raw: string): string | null {
  try {
    return canonicalUrl(raw);
  } catch {
    return null; // callers drop items whose link is unusable
  }
}

export function itemId(rawUrl: string): string {
  return createHash('sha1').update(canonicalUrl(rawUrl)).digest('hex').slice(0, ID_LENGTH);
}
