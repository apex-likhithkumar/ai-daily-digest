import { useEffect, useState } from 'react';
import type { Feed } from '../types';

interface FeedState {
  feed: Feed | null;
  error: string | null;
}

export function useFeed(): FeedState {
  const [state, setState] = useState<FeedState>({ feed: null, error: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('feed.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const feed = (await response.json()) as Feed;
        if (!cancelled) setState({ feed, error: null });
      } catch (error) {
        if (!cancelled) setState({ feed: null, error: error instanceof Error ? error.message : String(error) });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
