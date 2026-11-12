import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStored, writeStored } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('storage', () => {
  it('round-trips a value', () => {
    writeStored('k', { a: 1 });
    expect(readStored('k', null)).toEqual({ a: 1 });
  });

  it('returns the fallback for missing keys and corrupt JSON', () => {
    expect(readStored('missing', 'fb')).toBe('fb');
    window.localStorage.setItem('bad', '{oops');
    expect(readStored('bad', 'fb')).toBe('fb');
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readStored('k', 'fb')).toBe('fb');
    expect(() => writeStored('k', 1)).not.toThrow();
  });
});
