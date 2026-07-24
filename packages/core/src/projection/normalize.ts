/**
 * Robust layout normalization for PCA-projected 2D points.
 *
 * Prototype exposed a real pitfall: raw min/max normalization gets dominated by
 * outliers, squishing the point cloud into a corner. This module applies quantile
 * clipping + standard-deviation scaling to produce a well-utilized [0,1]² canvas.
 */

import type { Point2D } from './pca';

export interface NormalizeOptions {
  /** Quantile for clipping (0–0.5). Default 0.02 (clips 2% tails). */
  quantile?: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = p * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (index - lo);
}

/**
 * Robust normalization into [0,1]² preserving aspect ratio.
 * - Clips coordinates at the given quantile (default 2%) to remove outlier influence.
 * - Centers and scales by the clipped range.
 * - Outliers beyond clip bounds are clamped to [0,1].
 */
export function robustNormalizeLayout(
  points: Point2D[],
  options: NormalizeOptions = {},
): Point2D[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ x: 0.5, y: 0.5 }];

  const q = options.quantile ?? 0.02;

  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  const ys = points.map((p) => p.y).sort((a, b) => a - b);

  const xLo = percentile(xs, q);
  const xHi = percentile(xs, 1 - q);
  const yLo = percentile(ys, q);
  const yHi = percentile(ys, 1 - q);

  const xRange = xHi - xLo || 1;
  const yRange = yHi - yLo || 1;
  const span = Math.max(xRange, yRange);

  const padX = (span - xRange) / 2;
  const padY = (span - yRange) / 2;

  return points.map((p) => ({
    x: Math.max(0, Math.min(1, (p.x - xLo + padX) / span)),
    y: Math.max(0, Math.min(1, (p.y - yLo + padY) / span)),
  }));
}
