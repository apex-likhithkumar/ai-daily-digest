import { XMLParser } from 'fast-xml-parser';
import type { RssSource } from '../config';
import { httpGetText, type FetchLike } from '../http';
import { matchesAny } from '../keywords';
import { safeCanonicalUrl } from '../normalise';
import type { RawItem } from '../types';
import { stripHtml, toIso } from './util';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

type XmlNode = Record<string, unknown>;

function asNodes(value: unknown): XmlNode[] {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]) as XmlNode[];
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) return text((value as XmlNode)['#text']);
  return '';
}

function atomLink(link: unknown): string {
  const candidates = Array.isArray(link) ? link : [link];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate.trim();
    if (candidate && typeof candidate === 'object') {
      const node = candidate as XmlNode;
      const rel = node['@_rel'];
      if (rel === undefined || rel === 'alternate') return text(node['@_href']);
    }
  }
  return '';
}

export function parseFeed(xml: string, source: RssSource): RawItem[] {
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } }; feed?: { entry?: unknown } };
  const candidates = [
    ...asNodes(doc.rss?.channel?.item).map((it) => ({
      title: text(it.title),
      link: text(it.link),
      date: text(it.pubDate) || text(it['dc:date']),
      summary: text(it.description),
    })),
    ...asNodes(doc.feed?.entry).map((entry) => ({
      title: text(entry.title),
      link: atomLink(entry.link),
      date: text(entry.published) || text(entry.updated),
      summary: text(entry.summary) || text(entry.content),
    })),
  ];

  const items: RawItem[] = [];
  for (const c of candidates) {
    const publishedAt = toIso(c.date);
    if (!c.title || !c.link || !publishedAt || !safeCanonicalUrl(c.link)) continue;
    items.push({
      title: c.title,
      url: c.link,
      sourceId: source.id,
      sourceName: source.name,
      tier: source.tier,
      publishedAt,
      summary: stripHtml(c.summary),
      topicHint: source.topicHint,
    });
  }
  return items;
}

/** Keep only items mentioning one of the keywords (used for broad feeds like job boards). */
export function filterInclude(items: RawItem[], include: string[] | undefined): RawItem[] {
  if (!include || include.length === 0) return items;
  return items.filter((item) => matchesAny(`${item.title} ${item.summary}`, include));
}

export async function collectRss(source: RssSource, fetchImpl: FetchLike): Promise<RawItem[]> {
  const xml = await httpGetText(source.url, fetchImpl);
  return filterInclude(parseFeed(xml, source), source.include);
}
