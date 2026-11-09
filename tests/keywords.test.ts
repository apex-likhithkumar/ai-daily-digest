import { describe, expect, it } from 'vitest';
import { countMatches, matchesAny, matchesKeyword } from '../src/keywords';

describe('matchesKeyword', () => {
  it('matches whole words case-insensitively', () => {
    expect(matchesKeyword('New AI model ships', 'ai')).toBe(true);
  });

  it('does not match inside another word', () => {
    expect(matchesKeyword('He said hello', 'AI')).toBe(false);
    expect(matchesKeyword('cryptography basics', 'crypto')).toBe(false);
  });

  it('handles punctuation in the keyword and in the text', () => {
    expect(matchesKeyword('Node.js 24 released', 'Node.js')).toBe(true);
    expect(matchesKeyword('OpenAI releases GPT-5', 'GPT')).toBe(true);
  });
});

describe('matchesAny / countMatches', () => {
  it('reports any match and the number of distinct keywords matched', () => {
    expect(matchesAny('NestJS and BullMQ', ['bullmq', 'rust'])).toBe(true);
    expect(matchesAny('nothing here', ['bullmq'])).toBe(false);
    expect(countMatches('NestJS and BullMQ', ['nestjs', 'bullmq', 'rust'])).toBe(2);
  });
});
