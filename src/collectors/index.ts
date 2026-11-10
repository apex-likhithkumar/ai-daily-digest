import type { Source } from '../config';
import type { RawItem } from '../types';
import type { CollectContext } from './context';
import { collectGithub } from './github';
import { collectHn } from './hn';
import { collectRss } from './rss';

export async function collectOne(source: Source, ctx: CollectContext): Promise<RawItem[]> {
  switch (source.type) {
    case 'rss':
      return collectRss(source, ctx.fetchImpl);
    case 'hn':
      return collectHn(source, ctx);
    case 'github':
      return collectGithub(source, ctx);
  }
}

/** One broken source must never stop the others: failures are collected, not thrown. */
export async function collectAll(
  sources: Source[],
  ctx: CollectContext,
): Promise<{ items: RawItem[]; errors: string[] }> {
  const settled = await Promise.allSettled(sources.map((source) => collectOne(source, ctx)));
  const items: RawItem[] = [];
  const errors: string[] = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${sources[index]?.id ?? 'unknown'}: ${reason}`);
    }
  });
  return { items, errors };
}
