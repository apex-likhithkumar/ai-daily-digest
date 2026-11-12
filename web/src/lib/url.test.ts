import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from './url';

describe('safeHttpUrl', () => {
  it('allows http and https links', () => {
    expect(safeHttpUrl('https://openai.com/news/gpt-5')).toBe('https://openai.com/news/gpt-5');
    expect(safeHttpUrl('http://example.com/a')).toBe('http://example.com/a');
  });

  it('rejects other schemes, in any letter case', () => {
    for (const bad of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'file:///etc/passwd']) {
      expect(safeHttpUrl(bad)).toBeUndefined();
    }
  });

  it('rejects text that is not a URL', () => {
    expect(safeHttpUrl('not a url')).toBeUndefined();
    expect(safeHttpUrl('')).toBeUndefined();
  });
});
