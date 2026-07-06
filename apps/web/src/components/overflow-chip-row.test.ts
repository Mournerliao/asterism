import { describe, expect, it } from 'vitest';
import { calculateOverflowChipLayout } from './overflow-chip-row';

function overflowWidths(entries: Record<number, number>) {
  return new Map(Object.entries(entries).map(([count, width]) => [Number(count), width]));
}

describe('calculateOverflowChipLayout', () => {
  it('shows every chip when the row has enough width', () => {
    expect(
      calculateOverflowChipLayout({
        containerWidth: 100,
        itemWidths: [20, 20, 20],
        overflowWidths: overflowWidths({ 1: 24, 2: 24, 3: 24 }),
        gapWidth: 5,
      }),
    ).toEqual({ visibleCount: 3, overflowCount: 0 });
  });

  it('keeps the maximum visible chips and reserves space for the overflow chip', () => {
    expect(
      calculateOverflowChipLayout({
        containerWidth: 116,
        itemWidths: [40, 40, 40, 40],
        overflowWidths: overflowWidths({ 1: 24, 2: 24, 3: 24, 4: 24 }),
        gapWidth: 6,
      }),
    ).toEqual({ visibleCount: 2, overflowCount: 2 });
  });

  it('uses the measured overflow width for digit changes such as +9 to +10', () => {
    expect(
      calculateOverflowChipLayout({
        containerWidth: 90,
        itemWidths: Array.from({ length: 12 }, () => 20),
        overflowWidths: overflowWidths({
          1: 22,
          2: 22,
          3: 22,
          4: 22,
          5: 22,
          6: 22,
          7: 22,
          8: 22,
          9: 22,
          10: 30,
          11: 30,
          12: 30,
        }),
        gapWidth: 5,
      }),
    ).toEqual({ visibleCount: 2, overflowCount: 10 });
  });

  it('falls back to only the overflow chip for extremely narrow rows', () => {
    expect(
      calculateOverflowChipLayout({
        containerWidth: 4,
        itemWidths: [20, 20],
        overflowWidths: overflowWidths({ 1: 24, 2: 24 }),
        gapWidth: 6,
      }),
    ).toEqual({ visibleCount: 0, overflowCount: 2 });
  });
});
