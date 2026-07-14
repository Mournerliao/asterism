import { describe, expect, it } from 'vitest';
import { isTextTruncated } from './truncated-description';

describe('isTextTruncated', () => {
  it('detects vertical line clamping', () => {
    expect(
      isTextTruncated({ clientHeight: 40, scrollHeight: 60, clientWidth: 300, scrollWidth: 300 }),
    ).toBe(true);
  });

  it('detects horizontal overflow', () => {
    expect(
      isTextTruncated({ clientHeight: 40, scrollHeight: 40, clientWidth: 300, scrollWidth: 320 }),
    ).toBe(true);
  });

  it('does not enable a tooltip when the full text fits', () => {
    expect(
      isTextTruncated({ clientHeight: 40, scrollHeight: 40, clientWidth: 300, scrollWidth: 300 }),
    ).toBe(false);
  });
});
