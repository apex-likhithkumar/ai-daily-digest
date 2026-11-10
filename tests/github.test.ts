import { describe, expect, it } from 'vitest';
import { parseGithubRepos } from '../src/collectors/github';
import type { GithubSource } from '../src/config';

const SOURCE: GithubSource = { id: 'gh', type: 'github', name: 'GitHub', tier: 3, topics: ['llm'], minStars: 100, lookbackDays: 3 };

describe('parseGithubRepos', () => {
  it('turns repositories into raw items hinted as Tools', () => {
    const items = parseGithubRepos(
      {
        items: [
          { full_name: 'acme/agent-kit', html_url: 'https://github.com/acme/agent-kit', description: 'Build agents fast', created_at: '2026-11-08T10:00:00Z', stargazers_count: 420 },
          { full_name: 'acme/empty', html_url: 'https://github.com/acme/empty', description: null, created_at: '2026-11-08T11:00:00Z', stargazers_count: 150 },
        ],
      },
      SOURCE,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'acme/agent-kit: Build agents fast',
      url: 'https://github.com/acme/agent-kit',
      topicHint: 'F',
      publishedAt: '2026-11-08T10:00:00.000Z',
    });
    expect(items[1]?.title).toBe('acme/empty: new repository');
  });
});
