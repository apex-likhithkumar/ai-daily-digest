import { z } from 'zod';
import type { HnSource } from '../config';
import { httpGetText } from '../http';
import { safeCanonicalUrl } from '../normalise';
import type { RawItem } from '../types';
import type { CollectContext } from './context';
import { toIso } from './util';

const HN_SEARCH_URL = 'https://hn.algolia.com/api/v1/search_by_date';
const HN_ITEM_URL = 'https://news.ycombinator.com/item?id=';
const HITS_PER_QUERY = 20;
const SECONDS_PER_HOUR = 3600;

const hnSchema = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      title: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      created_at: z.string(),
      points: z.number().nullable().optional(),
    }),
  ),
});

export function parseHnHits(json: unknown, source: HnSource): RawItem[] {
  const parsed = hnSchema.parse(json);
  const items: RawItem[] = [];
  for (const hit of parsed.hits) {
    const publishedAt = toIso(hit.created_at);
    const url = hit.url || `${HN_ITEM_URL}${hit.objectID}`;
    if (!hit.title || !publishedAt || !safeCanonicalUrl(url)) continue;
    if ((hit.points ?? 0) < source.minPoints) continue;
    items.push({
      title: hit.title,
      url,
      sourceId: source.id,
      sourceName: source.name,
      tier: source.tier,
      publishedAt,
      summary: '',
    });
  }
  return items;
}

export async function collectHn(source: HnSource, ctx: CollectContext): Promise<RawItem[]> {
  const since = Math.floor(ctx.now.getTime() / 1000 - ctx.lookbackHours * SECONDS_PER_HOUR);
  const byUrl = new Map<string, RawItem>();
  for (const query of source.queries) {
    const params = new URLSearchParams({
      query,
      tags: 'story',
      numericFilters: `points>=${source.minPoints},created_at_i>${since}`,
      hitsPerPage: String(HITS_PER_QUERY),
    });
    const body = await httpGetText(`${HN_SEARCH_URL}?${params}`, ctx.fetchImpl);
    for (const item of parseHnHits(JSON.parse(body) as unknown, source)) byUrl.set(item.url, item);
  }
  return [...byUrl.values()];
}
