import { canonicalUrl, itemId } from './normalise';
import type { FeedItem, RawItem, Story } from './types';

export interface ClusterRules {
  similarity: number;
  minSharedTokens: number;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'at', 'by',
  'from', 'as', 'its', 'it', 'new', 'how', 'why', 'what', 'this', 'that',
]);
const MS_PER_HOUR = 3_600_000;

export function titleTokens(title: string): Set<string> {
  const tokens = title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 0 && !STOPWORDS.has(t));
  return new Set(tokens);
}

export function isSimilar(a: Set<string>, b: Set<string>, rules: ClusterRules): boolean {
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  const union = a.size + b.size - shared;
  if (union === 0) return false;
  return shared >= rules.minSharedTokens && shared / union >= rules.similarity;
}

/** Merge raw items about the same story within one run. Best-tier source supplies the headline and link. */
export function clusterRaw(raws: RawItem[], rules: ClusterRules): Story[] {
  const ordered = [...raws].sort((a, b) => a.tier - b.tier || a.publishedAt.localeCompare(b.publishedAt));
  const clusters: Array<{ story: Story; tokens: Set<string> }> = [];

  for (const item of ordered) {
    const id = itemId(item.url);
    const tokens = titleTokens(item.title);
    const match = clusters.find((c) => c.story.id === id || isSimilar(c.tokens, tokens, rules));
    if (match) {
      if (!match.story.sources.includes(item.sourceName)) match.story.sources.push(item.sourceName);
      if (item.publishedAt < match.story.publishedAt) match.story.publishedAt = item.publishedAt;
      if (!match.story.summary && item.summary) match.story.summary = item.summary;
      match.story.topicHint ??= item.topicHint;
      continue;
    }
    clusters.push({
      story: {
        id,
        title: item.title,
        url: canonicalUrl(item.url),
        sources: [item.sourceName],
        bestTier: item.tier,
        publishedAt: item.publishedAt,
        summary: item.summary,
        topicHint: item.topicHint,
      },
      tokens,
    });
  }
  return clusters.map((c) => c.story);
}

/**
 * A new story that matches a recent feed item corroborates it: add the sources to that item
 * (no re-scoring, no extra LLM call). Everything else is returned as `fresh`.
 */
export function mergeStories(
  existing: FeedItem[],
  stories: Story[],
  rules: ClusterRules,
  window: { now: Date; hours: number },
): { existing: FeedItem[]; fresh: Story[] } {
  const updated = existing.map((item) => ({ ...item, sources: [...item.sources] }));
  const candidates = updated
    .filter((item) => window.now.getTime() - Date.parse(item.firstSeenAt) <= window.hours * MS_PER_HOUR)
    .map((item) => ({ item, tokens: titleTokens(item.title) }));

  const fresh: Story[] = [];
  for (const story of stories) {
    const tokens = titleTokens(story.title);
    const match = candidates.find((c) => c.item.id === story.id || isSimilar(c.tokens, tokens, rules));
    if (!match) {
      fresh.push(story);
      continue;
    }
    for (const source of story.sources) {
      if (!match.item.sources.includes(source)) match.item.sources.push(source);
    }
  }
  return { existing: updated, fresh };
}
