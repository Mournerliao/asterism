/**
 * Projection module: deterministic PCA 2D projection + robust normalization.
 * Used by the star map feature (#21) to project 384-dim embedding vectors into
 * stable 2D canvas coordinates.
 */

export type { NormalizeOptions } from './normalize';
export { robustNormalizeLayout } from './normalize';
export type { Point2D } from './pca';
export { pca2d } from './pca';

/**
 * Convenience: project vectors to 2D and robustly normalize in one call.
 * This is the main entry point for the star map feature.
 */
import type { NormalizeOptions } from './normalize';
import { robustNormalizeLayout } from './normalize';
import type { Point2D } from './pca';
import { pca2d } from './pca';

export function projectAndNormalize(
  vectors: number[][],
  dim: number,
  options?: NormalizeOptions,
): Point2D[] {
  const raw = pca2d(vectors, dim);
  return robustNormalizeLayout(raw, options);
}
