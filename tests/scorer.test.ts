import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import type { LlmClient } from '../src/llm/types';
import { buildPrompt, extractJson, fallbackScore, parseScores, scoreStories } from '../src/scorer';
import type { Story } from '../src/types';

const { profile, rules } = loadConfig('config');

function story(over: Partial<Story>): Story {
  return {
    id: 'id1',
    title: 'Some title',
    url: 'https://example.com/a',
    sources: ['S'],
    bestTier: 2,
    publishedAt: '2026-11-09T08:00:00.000Z',
    summary: '',
    ...over,
  };
}

describe('extractJson', () => {
  it('parses plain JSON and fenced JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('throws on garbage', () => {
    expect(() => extractJson('not json')).toThrow();
  });
});

describe('buildPrompt', () => {
  it('numbers the items and includes titles, sources and the untrusted-data warning', () => {
    const prompt = buildPrompt(
      [story({ title: 'First story', sources: ['OpenAI', 'Hacker News'] }), story({ id: 'id2', title: 'Second story' })],
      profile,
      300,
    );
    expect(prompt).toContain('0. [OpenAI, Hacker News] First story');
    expect(prompt).toContain('1. [S] Second story');
    expect(prompt).toContain('untrusted');
  });
});

describe('parseScores', () => {
  const good = { index: 0, topic: 'B', importance: 9, relevance: 8, whyItMatters: 'Big release.' };

  it('maps valid entries by index', () => {
    const map = parseScores(JSON.stringify({ results: [good] }), 2);
    expect(map.get(0)).toEqual({ topic: 'B', importance: 9, relevance: 8, whyItMatters: 'Big release.' });
    expect(map.has(1)).toBe(false);
  });

  it('drops invalid entries, out-of-range indexes and duplicates but keeps the rest', () => {
    const text = JSON.stringify({
      results: [
        good,
        { ...good, index: 5 },
        { ...good, index: 1, importance: 11 },
        { ...good, index: 0, whyItMatters: 'duplicate' },
        { ...good, index: 1, topic: 'Z' },
      ],
    });
    const map = parseScores(text, 2);
    expect([...map.keys()]).toEqual([0]);
    expect(map.get(0)?.whyItMatters).toBe('Big release.');
  });

  it('truncates an over-long one-liner', () => {
    const long = 'x'.repeat(400);
    const map = parseScores(JSON.stringify({ results: [{ ...good, whyItMatters: long }] }), 1);
    expect(map.get(0)?.whyItMatters.length).toBeLessThanOrEqual(160);
    expect(map.get(0)?.whyItMatters.endsWith('…')).toBe(true);
  });

  it('throws when the reply has no results array', () => {
    expect(() => parseScores('{"foo":1}', 1)).toThrow();
  });
});

describe('fallbackScore', () => {
  it('scores from tier, source count and profile keywords, with no one-liner', () => {
    const score = fallbackScore(
      story({ title: 'NestJS and BullMQ tips', bestTier: 1, sources: ['A', 'B'] }),
      profile,
      rules.fallback,
    );
    expect(score.scoredBy).toBe('fallback');
    expect(score.whyItMatters).toBe('');
    expect(score.importance).toBe(rules.fallback.tierImportance['1'] + rules.fallback.perExtraSource);
    expect(score.topic).toBe('A');
    expect(score.relevance).toBeGreaterThan(rules.fallback.baseRelevance);
    expect(score.relevance).toBeLessThanOrEqual(10);
  });

  it('uses the source topicHint and the default topic when nothing matches', () => {
    expect(fallbackScore(story({ topicHint: 'E' }), profile, rules.fallback).topic).toBe('E');
    expect(fallbackScore(story({ title: 'zzz qqq' }), profile, rules.fallback).topic).toBe(rules.fallback.defaultTopic);
  });
});

describe('scoreStories', () => {
  const noSleep = async () => {};
  const log = () => {};

  it('batches, applies LLM scores, and pauses between batches', async () => {
    const stories = [1, 2, 3].map((n) => story({ id: `id${n}`, title: `Story ${n}`, bestTier: 1 }));
    let calls = 0;
    const llm: LlmClient = {
      async complete() {
        calls += 1;
        return JSON.stringify({ results: [{ index: 0, topic: 'A', importance: 9, relevance: 9, whyItMatters: 'Because.' }] });
      },
    };
    const sleeps: number[] = [];
    const result = await scoreStories(stories, {
      llm, profile, rules: { ...rules, scoring: { ...rules.scoring, batchSize: 2 } },
      sleep: async (ms) => { sleeps.push(ms); }, log,
    });
    expect(calls).toBe(2); // 3 stories / batch size 2
    expect(sleeps).toEqual([rules.scoring.delayMs]); // one pause between two batches
    expect(result.filter((s) => s.scoredBy === 'llm')).toHaveLength(2); // index 0 of each batch
    expect(result.filter((s) => s.scoredBy === 'fallback')).toHaveLength(1);
  });

  it('falls back for every story when the LLM keeps failing', async () => {
    const llm: LlmClient = { async complete() { throw new Error('quota'); } };
    const result = await scoreStories([story({})], { llm, profile, rules, sleep: noSleep, log });
    expect(result[0]?.scoredBy).toBe('fallback');
  });

  it('sends at most maxLlmItemsPerRun stories to the LLM, best tier first', async () => {
    const seen: string[] = [];
    const llm: LlmClient = {
      async complete(prompt) { seen.push(prompt); return JSON.stringify({ results: [] }); },
    };
    const stories = [
      story({ id: 'low', title: 'Low tier story', bestTier: 3 }),
      story({ id: 'top', title: 'Top tier story', bestTier: 1 }),
    ];
    await scoreStories(stories, {
      llm, profile, rules: { ...rules, scoring: { ...rules.scoring, maxLlmItemsPerRun: 1 } }, sleep: noSleep, log,
    });
    const prompts = seen.join('\n');
    expect(prompts).toContain('Top tier story');
    expect(prompts).not.toContain('Low tier story');
  });

  it('adds profile boosts to relevance (capped at 10)', async () => {
    const llm: LlmClient = {
      async complete() {
        return JSON.stringify({ results: [{ index: 0, topic: 'A', importance: 5, relevance: 9, whyItMatters: 'ok' }] });
      },
    };
    const [scored] = await scoreStories([story({ title: 'NestJS and TypeScript news' })], { llm, profile, rules, sleep: noSleep, log });
    expect(scored?.relevance).toBe(10);
  });
});
