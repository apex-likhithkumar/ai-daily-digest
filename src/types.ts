export const TOPICS = ['A', 'B', 'E', 'F'] as const;
export type Topic = (typeof TOPICS)[number];
export type Label = 'breaking' | 'today' | 'important';
export type Tier = 1 | 2 | 3;

/** One item as a collector sees it. */
export interface RawItem {
  title: string;
  url: string;
  sourceId: string;
  sourceName: string;
  tier: Tier;
  publishedAt: string; // ISO 8601 UTC
  summary: string; // plain text, already truncated
  topicHint?: Topic;
}

/** One news story: raw items about the same thing merged together. */
export interface Story {
  id: string;
  title: string;
  url: string; // canonical https URL (safe to render as a link)
  sources: string[]; // distinct source display names
  bestTier: Tier;
  publishedAt: string;
  summary: string;
  topicHint?: Topic;
}

export interface Score {
  topic: Topic;
  importance: number; // 0-10
  relevance: number; // 0-10
  whyItMatters: string; // '' when scored by fallback
  scoredBy: 'llm' | 'fallback';
}

export type ScoredStory = Story & Score;

export interface FeedItem extends ScoredStory {
  firstSeenAt: string;
  labels: Label[];
  rank: number;
}

export interface Feed {
  generatedAt: string;
  items: FeedItem[];
}

/** id -> ISO time it was first processed. */
export interface SeenIndex {
  ids: Record<string, string>;
}
