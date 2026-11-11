import type { Rules } from './config';
import type { FeedItem, Label } from './types';

const MS_PER_HOUR = 3_600_000;
const RANK_DECIMALS = 1000;

/** Age in hours; a publishedAt in the future (clock skew) counts as 0. */
export function ageHours(publishedAt: string, now: Date): number {
  return Math.max(0, (now.getTime() - Date.parse(publishedAt)) / MS_PER_HOUR);
}

export function computeLabels(
  item: Pick<FeedItem, 'importance' | 'sources' | 'bestTier' | 'publishedAt'>,
  now: Date,
  rules: Rules['labels'],
): Label[] {
  const age = ageHours(item.publishedAt, now);
  const labels: Label[] = [];

  const widelyCovered = item.sources.length >= rules.breaking.minSources || item.bestTier === 1;
  if (item.importance >= rules.breaking.minImportance && widelyCovered && age <= rules.breaking.maxAgeHours) {
    labels.push('breaking');
  }
  if (age <= rules.today.maxAgeHours) labels.push('today');
  if (item.importance >= rules.important.minImportance) labels.push('important');
  return labels;
}

export function computeRank(
  item: Pick<FeedItem, 'importance' | 'relevance' | 'publishedAt'>,
  now: Date,
  rules: Rules['rank'],
): number {
  const base = rules.importanceWeight * item.importance + rules.relevanceWeight * item.relevance;
  const decay = 0.5 ** (ageHours(item.publishedAt, now) / rules.halfLifeHours);
  return Math.round(base * decay * RANK_DECIMALS) / RANK_DECIMALS;
}
