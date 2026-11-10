import { z } from 'zod';
import type { GithubSource } from '../config';
import { httpGetText } from '../http';
import { safeCanonicalUrl } from '../normalise';
import type { RawItem } from '../types';
import type { CollectContext } from './context';
import { stripHtml, toIso } from './util';

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories';
const REPOS_PER_TOPIC = 10;
const MS_PER_DAY = 86_400_000;

const githubSchema = z.object({
  items: z.array(
    z.object({
      full_name: z.string(),
      html_url: z.string(),
      description: z.string().nullable(),
      created_at: z.string(),
      stargazers_count: z.number(),
    }),
  ),
});

export function parseGithubRepos(json: unknown, source: GithubSource): RawItem[] {
  const parsed = githubSchema.parse(json);
  const items: RawItem[] = [];
  for (const repo of parsed.items) {
    const publishedAt = toIso(repo.created_at);
    if (!publishedAt || !safeCanonicalUrl(repo.html_url)) continue;
    const description = repo.description ? stripHtml(repo.description) : '';
    items.push({
      title: `${repo.full_name}: ${description || 'new repository'}`,
      url: repo.html_url,
      sourceId: source.id,
      sourceName: source.name,
      tier: source.tier,
      publishedAt,
      summary: description,
      topicHint: 'F',
    });
  }
  return items;
}

export async function collectGithub(source: GithubSource, ctx: CollectContext): Promise<RawItem[]> {
  const sinceDate = new Date(ctx.now.getTime() - source.lookbackDays * MS_PER_DAY).toISOString().slice(0, 10);
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (ctx.githubToken) headers.Authorization = `Bearer ${ctx.githubToken}`;

  const byUrl = new Map<string, RawItem>();
  for (const topic of source.topics) {
    const params = new URLSearchParams({
      q: `topic:${topic} created:>${sinceDate} stars:>=${source.minStars}`,
      sort: 'stars',
      order: 'desc',
      per_page: String(REPOS_PER_TOPIC),
    });
    const body = await httpGetText(`${GITHUB_SEARCH_URL}?${params}`, ctx.fetchImpl, headers);
    for (const item of parseGithubRepos(JSON.parse(body) as unknown, source)) byUrl.set(item.url, item);
  }
  return [...byUrl.values()];
}
