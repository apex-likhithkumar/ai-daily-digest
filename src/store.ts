import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Feed, FeedItem, SeenIndex } from './types';

const FEED_FILE = 'feed.json';
const SEEN_FILE = 'seen.json';
const ARCHIVE_DIR = 'archive';
const MS_PER_DAY = 86_400_000;
const EPOCH = '1970-01-01T00:00:00.000Z';

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error; // corrupt JSON or permissions: fail loudly rather than overwrite good data
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function readFeed(dir: string): Promise<Feed> {
  return readJson<Feed>(join(dir, FEED_FILE), { generatedAt: EPOCH, items: [] });
}

export function writeFeed(dir: string, feed: Feed): Promise<void> {
  return writeJson(join(dir, FEED_FILE), feed);
}

export function readSeen(dir: string): Promise<SeenIndex> {
  return readJson<SeenIndex>(join(dir, SEEN_FILE), { ids: {} });
}

export function writeSeen(dir: string, seen: SeenIndex): Promise<void> {
  return writeJson(join(dir, SEEN_FILE), seen);
}

export function pruneSeen(seen: SeenIndex, now: Date, days: number): SeenIndex {
  const cutoff = now.getTime() - days * MS_PER_DAY;
  const ids = Object.fromEntries(Object.entries(seen.ids).filter(([, firstSeen]) => Date.parse(firstSeen) >= cutoff));
  return { ids };
}

export function splitArchive(
  items: FeedItem[],
  now: Date,
  feedDays: number,
): { kept: FeedItem[]; archived: FeedItem[] } {
  const cutoff = now.getTime() - feedDays * MS_PER_DAY;
  const kept: FeedItem[] = [];
  const archived: FeedItem[] = [];
  for (const item of items) (Date.parse(item.publishedAt) >= cutoff ? kept : archived).push(item);
  return { kept, archived };
}

export async function appendArchive(dir: string, archived: FeedItem[]): Promise<void> {
  const byMonth = new Map<string, FeedItem[]>();
  for (const item of archived) {
    const month = item.publishedAt.slice(0, 7); // YYYY-MM
    byMonth.set(month, [...(byMonth.get(month) ?? []), item]);
  }
  for (const [month, items] of byMonth) {
    const path = join(dir, ARCHIVE_DIR, `${month}.json`);
    const merged = new Map((await readJson<FeedItem[]>(path, [])).map((i) => [i.id, i]));
    for (const item of items) merged.set(item.id, item);
    await writeJson(path, [...merged.values()]);
  }
}
