import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefs } from './usePrefs';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('usePrefs', () => {
  it('starts with defaults and persists updates', () => {
    const { result } = renderHook(() => usePrefs());
    expect(result.current[0]).toEqual({ topics: [], muted: [], read: [], theme: 'system' });
    act(() => result.current[1]({ topics: ['E'] }));
    expect(result.current[0].topics).toEqual(['E']);
    const stored = JSON.parse(window.localStorage.getItem('digest.prefs.v1') ?? '{}') as { topics: string[] };
    expect(stored.topics).toEqual(['E']);
  });

  it('restores saved prefs and still works when storage throws', () => {
    window.localStorage.setItem('digest.prefs.v1', JSON.stringify({ muted: ['nft'] }));
    expect(renderHook(() => usePrefs()).result.current[0].muted).toEqual(['nft']);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => usePrefs());
    expect(result.current[0].theme).toBe('system');
    expect(() => act(() => result.current[1]({ theme: 'dark' }))).not.toThrow();
  });
});
