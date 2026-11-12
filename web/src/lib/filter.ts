import type { FeedItem, Topic } from '../types';

export type View = 'top' | 'breaking' | 'today' | 'important' | 'all';
export const VIEWS: View[] = ['top', 'breaking', 'today', 'important', 'all'];
export const TOP_COUNT = 20;

export interface FilterState {
  view: View;
  topics: Topic[];
  muted: string[];
}

const byRank = (a: FeedItem, b: FeedItem) => b.rank - a.rank;
const byDate = (a: FeedItem, b: FeedItem) => b.publishedAt.localeCompare(a.publishedAt);

export function filterItems(items: FeedItem[], state: FilterState): FeedItem[] {
  const muted = state.muted.map((m) => m.trim().toLowerCase()).filter(Boolean);
  const visible = items.filter((item) => {
    if (state.topics.length > 0 && !state.topics.includes(item.topic)) return false;
    const haystack = `${item.title} ${item.whyItMatters}`.toLowerCase();
    return !muted.some((word) => haystack.includes(word));
  });

  switch (state.view) {
    case 'top':
      return visible.sort(byRank).slice(0, TOP_COUNT);
    case 'breaking':
      return visible.filter((i) => i.labels.includes('breaking')).sort(byRank);
    case 'important':
      return visible.filter((i) => i.labels.includes('important')).sort(byRank);
    case 'today':
      return visible.filter((i) => i.labels.includes('today')).sort(byDate);
    case 'all':
      return visible.sort(byDate);
  }
}

export function viewCounts(items: FeedItem[], topics: Topic[], muted: string[]): Record<View, number> {
  return Object.fromEntries(
    VIEWS.map((view) => [view, filterItems(items, { view, topics, muted }).length]),
  ) as Record<View, number>;
}
