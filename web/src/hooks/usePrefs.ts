import { useCallback, useEffect, useState } from 'react';
import { readStored, writeStored } from '../lib/storage';
import type { Topic } from '../types';

export type Theme = 'system' | 'dark' | 'light';

export interface Prefs {
  topics: Topic[];
  muted: string[];
  read: string[];
  theme: Theme;
}

const PREFS_KEY = 'digest.prefs.v1';
export const READ_CAP = 500;
const DEFAULT_PREFS: Prefs = { topics: [], muted: [], read: [], theme: 'system' };

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    ...DEFAULT_PREFS,
    ...readStored<Partial<Prefs>>(PREFS_KEY, {}),
  }));

  useEffect(() => {
    writeStored(PREFS_KEY, prefs);
  }, [prefs]);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => ({ ...current, ...patch }));
  }, []);

  return [prefs, update];
}
