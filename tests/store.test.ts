import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendArchive, pruneSeen, readFeed, readSeen, splitArchive, writeFeed, writeSeen } from '../src/store';
import type { FeedItem } from '../src/types';

function item(id: string, publishedAt: string): FeedItem {
  return {
    id, title: id, url: `https://example.com/${id}`, sources: ['S'], bestTier: 2, publishedAt, summary: '',
    topic: 'A', importance: 5, relevance: 5, whyItMatters: '', scoredBy: 'fallback',
    firstSeenAt: publishedAt, labels: [], rank: 1,
  };
}

const NOW = new Date('2026-11-09T12:00:00.000Z');

describe('feed + seen persistence', () => {
  it('returns empty defaults when files do not exist yet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-store-'));
    expect(await readFeed(dir)).toEqual({ generatedAt: '1970-01-01T00:00:00.000Z', items: [] });
    expect(await readSeen(dir)).toEqual({ ids: {} });
  });

  it('round-trips the feed and the seen index', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-store-'));
    const feed = { generatedAt: NOW.toISOString(), items: [item('a', '2026-11-09T10:00:00.000Z')] };
    await writeFeed(dir, feed);
    await writeSeen(dir, { ids: { a: NOW.toISOString() } });
    expect(await readFeed(dir)).toEqual(feed);
    expect(await readSeen(dir)).toEqual({ ids: { a: NOW.toISOString() } });
  });

  it('rethrows read errors other than "file missing"', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-store-'));
    await writeFeed(dir, { generatedAt: NOW.toISOString(), items: [] });
    await writeFile(join(dir, 'feed.json'), '{ broken json');
    await expect(readFeed(dir)).rejects.toThrow();
  });
});

describe('pruneSeen', () => {
  it('drops ids first seen longer ago than the retention window', () => {
    const seen = { ids: { fresh: '2026-11-01T00:00:00.000Z', stale: '2026-08-01T00:00:00.000Z' } };
    expect(pruneSeen(seen, NOW, 60).ids).toEqual({ fresh: '2026-11-01T00:00:00.000Z' });
  });
});

describe('splitArchive / appendArchive', () => {
  it('splits by publishedAt age', () => {
    const { kept, archived } = splitArchive(
      [item('new', '2026-11-08T00:00:00.000Z'), item('old', '2026-09-01T00:00:00.000Z')],
      NOW,
      30,
    );
    expect(kept.map((i) => i.id)).toEqual(['new']);
    expect(archived.map((i) => i.id)).toEqual(['old']);
  });

  it('writes archived items to a per-month file and merges by id on repeat', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-store-'));
    await appendArchive(dir, [item('old1', '2026-09-01T00:00:00.000Z')]);
    await appendArchive(dir, [item('old1', '2026-09-01T00:00:00.000Z'), item('old2', '2026-09-15T00:00:00.000Z')]);
    const stored = JSON.parse(await readFile(join(dir, 'archive', '2026-09.json'), 'utf8')) as FeedItem[];
    expect(stored.map((i) => i.id).sort()).toEqual(['old1', 'old2']);
  });
});
