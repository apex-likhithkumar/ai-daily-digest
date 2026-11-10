import { describe, expect, it } from 'vitest';
import { parseHnHits } from '../src/collectors/hn';
import type { HnSource } from '../src/config';

const SOURCE: HnSource = { id: 'hn', type: 'hn', name: 'Hacker News', tier: 2, queries: ['LLM'], minPoints: 50 };

describe('parseHnHits', () => {
  it('maps hits, falls back to the HN item URL for text posts, and enforces minPoints', () => {
    const items = parseHnHits(
      {
        hits: [
          { objectID: '1', title: 'Claude gets a new mode', url: 'https://example.com/claude', created_at: '2026-11-09T07:00:00.000Z', points: 120 },
          { objectID: '2', title: 'Ask HN: best LLM for coding?', url: null, created_at: '2026-11-09T06:00:00.000Z', points: 80 },
          { objectID: '3', title: 'Low points story', url: 'https://example.com/low', created_at: '2026-11-09T06:00:00.000Z', points: 10 },
          { objectID: '4', title: null, url: 'https://example.com/none', created_at: '2026-11-09T06:00:00.000Z', points: 99 },
        ],
      },
      SOURCE,
    );
    expect(items.map((i) => i.url)).toEqual([
      'https://example.com/claude',
      'https://news.ycombinator.com/item?id=2',
    ]);
    expect(items[0]).toMatchObject({ sourceName: 'Hacker News', tier: 2, publishedAt: '2026-11-09T07:00:00.000Z' });
  });

  it('throws on an unexpected payload shape', () => {
    expect(() => parseHnHits({ nope: true }, SOURCE)).toThrow();
  });
});
