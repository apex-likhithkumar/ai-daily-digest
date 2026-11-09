import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const topicKey = z.enum(['A', 'B', 'E', 'F']);
const topicDef = z.object({ name: z.string(), keywords: z.array(z.string()).min(1) });

const profileSchema = z.object({
  topics: z.object({ A: topicDef, B: topicDef, E: topicDef, F: topicDef }),
  boosts: z.array(z.object({ keywords: z.array(z.string()).min(1), relevance: z.number() })).default([]),
  mute: z.array(z.string()).default([]),
});

const sourceBase = {
  id: z.string(),
  name: z.string(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
};
const rssSource = z.object({
  ...sourceBase,
  type: z.literal('rss'),
  url: z.string().url(),
  topicHint: topicKey.optional(),
  include: z.array(z.string()).optional(),
});
const hnSource = z.object({
  ...sourceBase,
  type: z.literal('hn'),
  queries: z.array(z.string()).min(1),
  minPoints: z.number().int().min(0),
});
const githubSource = z.object({
  ...sourceBase,
  type: z.literal('github'),
  topics: z.array(z.string()).min(1),
  minStars: z.number().int().min(0),
  lookbackDays: z.number().int().min(1),
});
const sourcesFileSchema = z.object({
  sources: z.array(z.discriminatedUnion('type', [rssSource, hnSource, githubSource])).min(1),
});

const rulesSchema = z.object({
  collect: z.object({ maxAgeHours: z.number().positive() }),
  cluster: z.object({ similarity: z.number().min(0).max(1), minSharedTokens: z.number().int().min(1) }),
  scoring: z.object({
    batchSize: z.number().int().min(1),
    maxLlmItemsPerRun: z.number().int().min(0),
    delayMs: z.number().int().min(0),
    snippetChars: z.number().int().min(0),
  }),
  llm: z.object({
    providers: z.array(z.object({ type: z.enum(['gemini', 'groq']), model: z.string() })),
  }),
  fallback: z.object({
    tierImportance: z.object({ '1': z.number(), '2': z.number(), '3': z.number() }),
    perExtraSource: z.number(),
    maxExtraSources: z.number().int().min(0),
    baseRelevance: z.number(),
    perKeywordRelevance: z.number(),
    defaultTopic: topicKey,
  }),
  labels: z.object({
    breaking: z.object({ minImportance: z.number(), minSources: z.number().int(), maxAgeHours: z.number() }),
    today: z.object({ maxAgeHours: z.number() }),
    important: z.object({ minImportance: z.number() }),
  }),
  rank: z.object({
    importanceWeight: z.number(),
    relevanceWeight: z.number(),
    halfLifeHours: z.number().positive(),
  }),
  retention: z.object({ feedDays: z.number().int().positive(), seenDays: z.number().int().positive() }),
});

export type Profile = z.infer<typeof profileSchema>;
export type Source = z.infer<typeof sourcesFileSchema>['sources'][number];
export type RssSource = Extract<Source, { type: 'rss' }>;
export type HnSource = Extract<Source, { type: 'hn' }>;
export type GithubSource = Extract<Source, { type: 'github' }>;
export type Rules = z.infer<typeof rulesSchema>;

export interface AppConfig {
  profile: Profile;
  sources: Source[];
  rules: Rules;
}

function loadYaml<S extends z.ZodTypeAny>(path: string, schema: S): z.infer<S> {
  const parsed = schema.safeParse(parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    throw new Error(`Invalid config ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function loadConfig(dir = 'config'): AppConfig {
  return {
    profile: loadYaml(join(dir, 'profile.yml'), profileSchema),
    sources: loadYaml(join(dir, 'sources.yml'), sourcesFileSchema).sources,
    rules: loadYaml(join(dir, 'rules.yml'), rulesSchema),
  };
}
