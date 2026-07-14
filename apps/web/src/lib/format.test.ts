import { describe, expect, it } from 'vitest';
import { formatCompactRelativeTime } from './format';

const NOW = Date.parse('2026-07-14T12:00:00.000Z');

describe('formatCompactRelativeTime', () => {
  it('formats past dates compactly in English and Chinese', () => {
    const twoWeeksAgo = '2026-06-30T12:00:00.000Z';
    expect(formatCompactRelativeTime(twoWeeksAgo, 'en', NOW)).toBe('2w');
    expect(formatCompactRelativeTime(twoWeeksAgo, 'zh-CN', NOW)).toBe('2周前');
  });

  it('preserves future direction for clock skew', () => {
    const inThreeDays = '2026-07-17T12:00:00.000Z';
    expect(formatCompactRelativeTime(inThreeDays, 'en', NOW)).toBe('in 3d');
    expect(formatCompactRelativeTime(inThreeDays, 'zh-CN', NOW)).toBe('3天后');
  });

  it('handles recent and invalid values', () => {
    expect(formatCompactRelativeTime('2026-07-14T11:59:45.000Z', 'en', NOW)).toBe('now');
    expect(formatCompactRelativeTime('invalid', 'en', NOW)).toBeNull();
    expect(formatCompactRelativeTime(null, 'en', NOW)).toBeNull();
  });
});
