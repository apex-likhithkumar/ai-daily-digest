import { describe, expect, it } from 'vitest';
import { hoursSince, timeAgo } from './time';

const NOW = new Date('2026-11-09T12:00:00.000Z');

describe('timeAgo', () => {
  it('formats minutes, hours and days', () => {
    expect(timeAgo('2026-11-09T11:59:40.000Z', NOW)).toBe('just now');
    expect(timeAgo('2026-11-09T11:15:00.000Z', NOW)).toBe('45m ago');
    expect(timeAgo('2026-11-09T07:00:00.000Z', NOW)).toBe('5h ago');
    expect(timeAgo('2026-11-06T12:00:00.000Z', NOW)).toBe('3d ago');
  });
  it('treats future timestamps as just now', () => {
    expect(timeAgo('2026-11-09T13:00:00.000Z', NOW)).toBe('just now');
  });
});

describe('hoursSince', () => {
  it('returns fractional hours', () => {
    expect(hoursSince('2026-11-09T09:00:00.000Z', NOW)).toBe(3);
  });
});
