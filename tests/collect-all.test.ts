import { describe, expect, it } from 'vitest';
import { collectAll } from '../src/collectors';
import type { RssSource } from '../src/config';
import type { FetchLike } from '../src/http';

const RSS = `<rss><channel><item><title>Hello world story</title><link>https://example.com/a</link><pubDate>Mon, 09 Nov 2026 08:00:00 GMT</pubDate></item></channel></rss>`;

const fetchImpl: FetchLike = async (input) => {
  if (String(input).includes('bad')) throw new Error('boom');
  return new Response(RSS, { status: 200 });
};

const good: RssSource = { id: 'good', type: 'rss', name: 'Good', tier: 1, url: 'https://good.example/feed' };
const bad: RssSource = { id: 'bad', type: 'rss', name: 'Bad', tier: 1, url: 'https://bad.example/feed' };

describe('collectAll', () => {
  it('isolates a failing source and still returns the others', async () => {
    const result = await collectAll([good, bad], { fetchImpl, now: new Date('2026-11-09T09:00:00Z'), lookbackHours: 72 });
    expect(result.items).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('bad: boom');
  });
});
