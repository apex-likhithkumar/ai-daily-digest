import { describe, expect, it } from 'vitest';
import { canonicalUrl, itemId, safeCanonicalUrl } from '../src/normalise';

describe('canonicalUrl', () => {
  it('forces https, strips www, tracking params, hash and trailing slash, sorts params', () => {
    expect(canonicalUrl('http://www.Example.com/post/?utm_source=x&b=2&a=1#frag')).toBe(
      'https://example.com/post?a=1&b=2',
    );
  });

  it('keeps the root path slash', () => {
    expect(canonicalUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('rejects non-http(s) protocols', () => {
    expect(() => canonicalUrl('javascript:alert(1)')).toThrow();
    expect(safeCanonicalUrl('javascript:alert(1)')).toBeNull();
    expect(safeCanonicalUrl('not a url')).toBeNull();
  });
});

describe('itemId', () => {
  it('is stable across tracking-param and www differences', () => {
    expect(itemId('https://www.example.com/a?utm_medium=z')).toBe(itemId('https://example.com/a'));
  });

  it('is a 16-char hex string', () => {
    expect(itemId('https://example.com/a')).toMatch(/^[0-9a-f]{16}$/);
  });
});
