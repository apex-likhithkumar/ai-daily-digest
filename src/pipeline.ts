import { clusterRaw, mergeStories } from './cluster';
import type { AppConfig } from './config';
import { matchesAny } from './keywords';
import { ageHours, computeLabels, computeRank } from './labeler';
import type { LlmClient } from './llm/types';
import { itemId } from './normalise';
import { scoreStories } from './scorer';
import { appendArchive, pruneSeen, readFeed, readSeen, splitArchive, writeFeed, writeSeen } from './store';
import type { FeedItem, RawItem } from './types';

export interface PipelineDeps {
  dataDir: string;
  config: AppConfig;
  llm: LlmClient;
  now: Date;
  collect: () => Promise<{ items: RawItem[]; errors: string[] }>;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
}

export interface PipelineSummary {
  collected: number;
  unseen: number;
  newStories: number;
  llmScored: number;
  fallbackScored: number;
  sourceErrors: number;
  totalItems: number;
}

export async function runPipeline(deps: PipelineDeps): Promise<PipelineSummary> {
  const { dataDir, config, now } = deps;
  const { profile, rules } = config;
  const nowIso = now.toISOString();

  const collected = await deps.collect();
  collected.errors.forEach((error) => deps.log(`source error: ${error}`));

  // Zero items alongside errors means an outage (or a blocked runner), not a quiet news day. Stop before
  // writing anything, so the site keeps the last good feed instead of a fresh timestamp over stale content.
  if (collected.items.length === 0 && collected.errors.length > 0) {
    throw new Error(`All sources failed (${collected.errors.length} errors); not overwriting the feed`);
  }

  const candidates = collected.items
    .filter((raw) => ageHours(raw.publishedAt, now) <= rules.collect.maxAgeHours)
    .filter((raw) => !matchesAny(`${raw.title} ${raw.summary}`, profile.mute));

  const seen = pruneSeen(await readSeen(dataDir), now, rules.retention.seenDays);
  const unseen = candidates.filter((raw) => !(itemId(raw.url) in seen.ids));

  const stories = clusterRaw(unseen, rules.cluster);
  const feed = await readFeed(dataDir);
  const merged = mergeStories(feed.items, stories, rules.cluster, { now, hours: rules.collect.maxAgeHours });

  const scored = await scoreStories(merged.fresh, {
    llm: deps.llm, profile, rules, sleep: deps.sleep, log: deps.log,
  });
  // The source excerpt was only needed for scoring; never publish it (spec: no article text in feed.json).
  const newItems: FeedItem[] = scored.map((story) => ({ ...story, summary: '', firstSeenAt: nowIso, labels: [], rank: 0 }));

  const { kept, archived } = splitArchive([...merged.existing, ...newItems], now, rules.retention.feedDays);
  const items = kept
    .map((item) => ({
      ...item,
      labels: computeLabels(item, now, rules.labels),
      rank: computeRank(item, now, rules.rank),
    }))
    .sort((a, b) => b.rank - a.rank);

  for (const raw of unseen) seen.ids[itemId(raw.url)] = nowIso;

  await appendArchive(dataDir, archived);
  await writeFeed(dataDir, { generatedAt: nowIso, items });
  await writeSeen(dataDir, seen);

  return {
    collected: collected.items.length,
    unseen: unseen.length,
    newStories: merged.fresh.length,
    llmScored: scored.filter((s) => s.scoredBy === 'llm').length,
    fallbackScored: scored.filter((s) => s.scoredBy === 'fallback').length,
    sourceErrors: collected.errors.length,
    totalItems: items.length,
  };
}
