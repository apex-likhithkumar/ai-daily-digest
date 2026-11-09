import { describe, expect, it } from 'vitest';
import { clusterRaw, isSimilar, mergeStories, titleTokens } from '../src/cluster';
import type { FeedItem, RawItem } from '../src/types';

const RULES = { similarity: 0.5, minSharedTokens: 2 };

function raw(over: Partial<RawItem>): RawItem {
  return {
    title: 'Title',
    url: 'https://example.com/a',
    sourceId: 's',
    sourceName: 'S',
    tier: 2,
    publishedAt: '2026-11-09T08:00:00.000Z',
    summary: '',
    ...over,
  };
}

describe('isSimilar', () => {
  it('treats reworded headlines about the same event as the same story', () => {
    expect(isSimilar(titleTokens('OpenAI releases GPT-5 model'), titleTokens('OpenAI launches GPT-5'), RULES)).toBe(true);
  });

  it('keeps unrelated headlines apart', () => {
    expect(isSimilar(titleTokens('Anthropic ships Claude update'), titleTokens('OpenAI releases GPT-5 model'), RULES)).toBe(false);
  });

  it('never matches on a single shared token', () => {
    expect(isSimilar(titleTokens('GPT'), titleTokens('GPT'), RULES)).toBe(false);
  });
});

describe('clusterRaw', () => {
  it('merges near-duplicates into one story and lists every source once', () => {
    const stories = clusterRaw(
      [
        raw({ title: 'OpenAI launches GPT-5', url: 'https://reddit.com/r/x/1', sourceName: 'r/LocalLLaMA', tier: 3 }),
        raw({ title: 'OpenAI releases GPT-5 model', url: 'https://openai.com/news/gpt-5', sourceName: 'OpenAI', tier: 1 }),
        raw({ title: 'Cursor adds agent mode', url: 'https://cursor.com/blog/agent', sourceName: 'Cursor' }),
      ],
      RULES,
    );
    expect(stories).toHaveLength(2);
    const gpt = stories.find((s) => s.title.includes('GPT-5'));
    expect(gpt?.title).toBe('OpenAI releases GPT-5 model'); // tier-1 source wins the headline
    expect(gpt?.url).toBe('https://openai.com/news/gpt-5');
    expect(gpt?.sources.sort()).toEqual(['OpenAI', 'r/LocalLLaMA']);
    expect(gpt?.bestTier).toBe(1);
  });

  it('merges identical canonical URLs even when titles differ', () => {
    const stories = clusterRaw(
      [
        raw({ title: 'Alpha beta gamma', url: 'https://example.com/x?utm_source=a', sourceName: 'A' }),
        raw({ title: 'Totally different words here', url: 'https://www.example.com/x', sourceName: 'B' }),
      ],
      RULES,
    );
    expect(stories).toHaveLength(1);
    expect(stories[0]?.sources.sort()).toEqual(['A', 'B']);
  });
});

describe('mergeStories', () => {
  const existingItem: FeedItem = {
    id: 'aaaa',
    title: 'OpenAI releases GPT-5 model',
    url: 'https://openai.com/news/gpt-5',
    sources: ['OpenAI'],
    bestTier: 1,
    publishedAt: '2026-11-09T08:00:00.000Z',
    summary: '',
    topic: 'B',
    importance: 9,
    relevance: 8,
    whyItMatters: 'x',
    scoredBy: 'llm',
    firstSeenAt: '2026-11-09T08:30:00.000Z',
    labels: [],
    rank: 0,
  };
  const window = { now: new Date('2026-11-09T11:30:00.000Z'), hours: 72 };

  it('adds the source to a matching recent feed item instead of creating a new story', () => {
    const [story] = clusterRaw([raw({ title: 'OpenAI GPT-5 launched with new model', url: 'https://news.ycombinator.com/item?id=1', sourceName: 'Hacker News' })], RULES);
    const result = mergeStories([existingItem], story ? [story] : [], RULES, window);
    expect(result.fresh).toHaveLength(0);
    expect(result.existing[0]?.sources).toEqual(['OpenAI', 'Hacker News']);
    expect(existingItem.sources).toEqual(['OpenAI']); // input not mutated
  });

  it('passes unrelated stories through as fresh', () => {
    const stories = clusterRaw([raw({ title: 'Cursor adds agent mode', url: 'https://cursor.com/blog/agent' })], RULES);
    const result = mergeStories([existingItem], stories, RULES, window);
    expect(result.fresh).toHaveLength(1);
  });

  it('ignores feed items older than the merge window', () => {
    const old = { ...existingItem, firstSeenAt: '2026-10-01T00:00:00.000Z' };
    const stories = clusterRaw([raw({ title: 'OpenAI GPT-5 launched with new model', url: 'https://news.ycombinator.com/item?id=1' })], RULES);
    expect(mergeStories([old], stories, RULES, window).fresh).toHaveLength(1);
  });
});
