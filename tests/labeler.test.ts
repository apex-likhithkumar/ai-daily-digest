import { describe, expect, it } from 'vitest';
import { computeLabels, computeRank } from '../src/labeler';

const LABELS = {
  breaking: { minImportance: 8, minSources: 3, maxAgeHours: 6 },
  today: { maxAgeHours: 24 },
  important: { minImportance: 7 },
};
const RANK = { importanceWeight: 0.6, relevanceWeight: 0.4, halfLifeHours: 24 };
const NOW = new Date('2026-11-09T12:00:00.000Z');

function item(over: Partial<{ importance: number; sources: string[]; bestTier: 1 | 2 | 3; publishedAt: string }>) {
  return {
    importance: 8,
    sources: ['A', 'B', 'C'],
    bestTier: 2 as const,
    publishedAt: '2026-11-09T09:00:00.000Z', // 3h old
    ...over,
  };
}

describe('computeLabels', () => {
  it('marks breaking when important, widely covered and fresh', () => {
    expect(computeLabels(item({}), NOW, LABELS)).toEqual(['breaking', 'today', 'important']);
  });

  it('breaking boundaries are inclusive: importance 8, 3 sources, exactly 6h old', () => {
    expect(computeLabels(item({ publishedAt: '2026-11-09T06:00:00.000Z' }), NOW, LABELS)).toContain('breaking');
  });

  it('is not breaking just over 6h old, just under importance 8, or with too few sources', () => {
    expect(computeLabels(item({ publishedAt: '2026-11-09T05:59:00.000Z' }), NOW, LABELS)).not.toContain('breaking');
    expect(computeLabels(item({ importance: 7.9 }), NOW, LABELS)).not.toContain('breaking');
    expect(computeLabels(item({ sources: ['A', 'B'] }), NOW, LABELS)).not.toContain('breaking');
  });

  it('a single tier-1 source is enough for breaking', () => {
    expect(computeLabels(item({ sources: ['OpenAI'], bestTier: 1 }), NOW, LABELS)).toContain('breaking');
  });

  it('today covers the last 24h inclusive and treats future dates as age 0', () => {
    expect(computeLabels(item({ importance: 1, publishedAt: '2026-11-08T12:00:00.000Z' }), NOW, LABELS)).toEqual(['today']);
    expect(computeLabels(item({ importance: 1, publishedAt: '2026-11-08T11:59:00.000Z' }), NOW, LABELS)).toEqual([]);
    expect(computeLabels(item({ importance: 1, publishedAt: '2026-11-09T13:00:00.000Z' }), NOW, LABELS)).toEqual(['today']);
  });

  it('important applies at any age', () => {
    expect(computeLabels(item({ importance: 7, publishedAt: '2026-10-20T00:00:00.000Z' }), NOW, LABELS)).toEqual(['important']);
  });
});

describe('computeRank', () => {
  it('weights importance and relevance with no decay for a brand-new item', () => {
    const rank = computeRank({ importance: 10, relevance: 5, publishedAt: NOW.toISOString() }, NOW, RANK);
    expect(rank).toBeCloseTo(0.6 * 10 + 0.4 * 5, 3);
  });

  it('halves the score every half-life', () => {
    const fresh = computeRank({ importance: 10, relevance: 10, publishedAt: NOW.toISOString() }, NOW, RANK);
    const old = computeRank({ importance: 10, relevance: 10, publishedAt: '2026-11-08T12:00:00.000Z' }, NOW, RANK);
    expect(old).toBeCloseTo(fresh / 2, 2);
  });
});
