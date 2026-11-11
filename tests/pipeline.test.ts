import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import type { LlmClient } from '../src/llm/types';
import { runPipeline } from '../src/pipeline';
import { readFeed } from '../src/store';
import type { RawItem } from '../src/types';

const config = loadConfig('config');
const T0 = new Date('2026-11-09T09:00:00.000Z');
const T1 = new Date('2026-11-09T12:00:00.000Z');

function raw(over: Partial<RawItem>): RawItem {
  return {
    title: 't', url: 'https://example.com/t', sourceId: 's', sourceName: 'S', tier: 2,
    publishedAt: '2026-11-09T08:00:00.000Z', summary: '', ...over,
  };
}

class FakeLlm implements LlmClient {
  calls = 0;
  async complete(): Promise<string> {
    this.calls += 1;
    return JSON.stringify({
      results: [
        { index: 0, topic: 'B', importance: 9, relevance: 8, whyItMatters: 'Big model release.' },
        { index: 1, topic: 'F', importance: 5, relevance: 6, whyItMatters: 'Handy editor feature.' },
      ],
    });
  }
}

const RUN1 = [
  raw({ title: 'OpenAI releases GPT-5 model', url: 'https://openai.com/news/gpt-5', sourceName: 'OpenAI', tier: 1, summary: 'Excerpt of the source article' }),
  raw({ title: 'OpenAI launches GPT-5', url: 'https://reddit.com/r/x/1', sourceName: 'r/LocalLLaMA', tier: 3 }),
  raw({ title: 'Cursor adds agent mode to its editor', url: 'https://cursor.com/blog/agent', sourceName: 'Cursor', publishedAt: '2026-11-09T08:30:00.000Z' }),
  raw({ title: 'Memecoin AI agent token pumps', url: 'https://example.com/coin' }),
  raw({ title: 'Ancient story from last month', url: 'https://example.com/old', publishedAt: '2026-10-01T00:00:00.000Z' }),
];
const RUN2 = [
  raw({ title: 'OpenAI GPT-5 launched with new model', url: 'https://news.ycombinator.com/item?id=1', sourceName: 'Hacker News', publishedAt: '2026-11-09T11:00:00.000Z' }),
];

describe('runPipeline', () => {
  async function run(dir: string, llm: LlmClient, items: RawItem[], now: Date) {
    return runPipeline({
      dataDir: dir, config, llm, now,
      collect: async () => ({ items, errors: ['broken-source: boom'] }),
      sleep: async () => {}, log: () => {},
    });
  }

  it('collects, drops muted and stale items, clusters, scores and labels', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-pipe-'));
    const llm = new FakeLlm();
    await run(dir, llm, RUN1, T0);

    const feed = await readFeed(dir);
    expect(feed.generatedAt).toBe(T0.toISOString());
    expect(feed.items.map((i) => i.title).sort()).toEqual(['Cursor adds agent mode to its editor', 'OpenAI releases GPT-5 model']);

    const gpt = feed.items.find((i) => i.title.includes('GPT-5'));
    expect(gpt?.sources.sort()).toEqual(['OpenAI', 'r/LocalLLaMA']);
    expect(gpt?.whyItMatters).toBe('Big model release.');
    expect(gpt?.labels).toEqual(['breaking', 'today', 'important']);
    expect(gpt?.summary).toBe(''); // source excerpt is never published
    expect(feed.items[0]?.id).toBe(gpt?.id); // sorted by rank, best first
    expect(llm.calls).toBe(1);
  });

  it('adds corroborating sources to an existing item without calling the LLM, and is idempotent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-pipe-'));
    const llm = new FakeLlm();
    await run(dir, llm, RUN1, T0);
    await run(dir, llm, RUN2, T1);
    await run(dir, llm, RUN2, T1); // same input again: already seen

    const feed = await readFeed(dir);
    expect(feed.items).toHaveLength(2);
    const gpt = feed.items.find((i) => i.title.includes('GPT-5'));
    expect(gpt?.sources).toContain('Hacker News');
    expect(gpt?.sources).toHaveLength(3);
    expect(llm.calls).toBe(1);
  });

  it('moves items older than the retention window out of the feed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-pipe-'));
    await run(dir, new FakeLlm(), RUN1, T0);
    const later = new Date('2026-12-20T09:00:00.000Z'); // 41 days later
    await run(dir, new FakeLlm(), [], later);
    expect((await readFeed(dir)).items).toHaveLength(0);
  });

  it('returns a summary with counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'digest-pipe-'));
    const summary = await run(dir, new FakeLlm(), RUN1, T0);
    expect(summary).toMatchObject({ collected: 5, newStories: 2, sourceErrors: 1, totalItems: 2 });
  });
});
