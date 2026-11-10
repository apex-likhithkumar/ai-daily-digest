import type { FetchLike } from '../http';

export interface CollectContext {
  fetchImpl: FetchLike;
  now: Date;
  lookbackHours: number;
  githubToken?: string;
}
