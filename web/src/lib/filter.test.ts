import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../types';
import { filterItems, MAX_PER_SOURCE_IN_TOP, TOP_COUNT, viewCounts } from './filter';

function mk(over: Partial<FeedItem>): FeedItem {
  return {
    id: 'x', title: 'Title', url: 'https://example.com', sources: ['A'], bestTier: 2,
    publishedAt: '2026-11-09T08:00:00.000Z', summary: '', topic: 'A', importance: 5, relevance: 5,
    whyItMatters: 'why', scoredBy: 'llm', firstSeenAt: '2026-11-09T08:00:00.000Z', labels: [], rank: 5, ...over,
  };
}

const none = { topics: [], muted: [] };

describe('filterItems', () => {
  it('top: best rank first, capped at TOP_COUNT', () => {
    const items = Array.from({ length: TOP_COUNT + 5 }, (_, i) => mk({ id: `i${i}`, rank: i }));
    const result = filterItems(items, { view: 'top', ...none });
    expect(result).toHaveLength(TOP_COUNT);
    expect(result[0]?.id).toBe(`i${TOP_COUNT + 4}`);
  });

  // Added after live feedback: one prolific source (AWS blog) took 4 of the top 8 spots.
  it('top: one source cannot fill the page when other sources have items', () => {
    const aws = Array.from({ length: 6 }, (_, i) => mk({ id: `aws${i}`, sources: ['AWS ML Blog'], rank: 100 - i }));
    const others = Array.from({ length: TOP_COUNT }, (_, i) => mk({ id: `o${i}`, sources: [`Source ${i}`], rank: i }));
    const result = filterItems([...aws, ...others], { view: 'top', ...none });
    expect(result).toHaveLength(TOP_COUNT);
    expect(result.filter((i) => i.sources[0] === 'AWS ML Blog')).toHaveLength(MAX_PER_SOURCE_IN_TOP);
  });

  it('top: capped items only backfill, at the end, when the page would otherwise be short', () => {
    const aws = Array.from({ length: 5 }, (_, i) => mk({ id: `aws${i}`, sources: ['AWS ML Blog'], rank: 10 - i }));
    const others = Array.from({ length: 2 }, (_, i) => mk({ id: `o${i}`, sources: [`Source ${i}`], rank: 1 + i }));
    const ids = filterItems([...aws, ...others], { view: 'top', ...none }).map((i) => i.id);
    expect(ids).toEqual(['aws0', 'aws1', 'aws2', 'o1', 'o0', 'aws3', 'aws4']);
  });

  it('breaking / important / today use labels; today is newest first', () => {
    const items = [
      mk({ id: 'b', labels: ['breaking', 'today'], publishedAt: '2026-11-09T06:00:00.000Z' }),
      mk({ id: 't', labels: ['today'], publishedAt: '2026-11-09T09:00:00.000Z' }),
      mk({ id: 'i', labels: ['important'] }),
    ];
    expect(filterItems(items, { view: 'breaking', ...none }).map((i) => i.id)).toEqual(['b']);
    expect(filterItems(items, { view: 'important', ...none }).map((i) => i.id)).toEqual(['i']);
    expect(filterItems(items, { view: 'today', ...none }).map((i) => i.id)).toEqual(['t', 'b']);
  });

  it('all: everything, newest first', () => {
    const items = [mk({ id: 'old', publishedAt: '2026-11-01T00:00:00.000Z' }), mk({ id: 'new' })];
    expect(filterItems(items, { view: 'all', ...none }).map((i) => i.id)).toEqual(['new', 'old']);
  });

  it('no topics selected means all topics; selected topics narrow the list', () => {
    const items = [mk({ id: 'a', topic: 'A' }), mk({ id: 'e', topic: 'E' })];
    expect(filterItems(items, { view: 'all', topics: [], muted: [] })).toHaveLength(2);
    expect(filterItems(items, { view: 'all', topics: ['E'], muted: [] }).map((i) => i.id)).toEqual(['e']);
  });

  it('hides items whose title or one-liner contains a muted keyword (case-insensitive)', () => {
    const items = [mk({ id: 'a', title: 'Crypto AI token' }), mk({ id: 'b', whyItMatters: 'about NFT stuff' }), mk({ id: 'c' })];
    const result = filterItems(items, { view: 'all', topics: [], muted: ['crypto', 'nft'] });
    expect(result.map((i) => i.id)).toEqual(['c']);
  });

  // Added after review: muting "ai" must not hide "maintain" or "said" (matches the backend's whole-word rule).
  it('muted keywords match whole words only, including punctuation-heavy ones', () => {
    const items = [
      mk({ id: 'maintain', title: 'How to maintain a repo' }),
      mk({ id: 'said', whyItMatters: 'The CEO said it works' }),
      mk({ id: 'ai', title: 'New AI model ships' }),
      mk({ id: 'node', title: 'Node.js 24 released' }),
      mk({ id: 'plain', title: 'Rust compiler update' }),
    ];
    const result = filterItems(items, { view: 'all', topics: [], muted: ['ai', 'node.js'] });
    expect(result.map((i) => i.id).sort()).toEqual(['maintain', 'plain', 'said']);
  });
});

describe('viewCounts', () => {
  it('counts each view with the same topic and mute settings', () => {
    const items = [mk({ id: 'a', labels: ['breaking'] }), mk({ id: 'b' })];
    expect(viewCounts(items, [], [])).toEqual({ top: 2, breaking: 1, today: 0, important: 0, all: 2 });
  });
});
