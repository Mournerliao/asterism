# Log: #22 涌现簇 + promotion（双平面唯一写入桥）

**Date**: 2026-07-25
**Issue**: GitHub #22
**ADR**: 0026 §8

## Summary

Implemented emergent clusters and promotion as the dual-plane's only write bridge. The derived plane uses pure vector density clustering (HDBSCAN) to surface topic areas; users can promote a cluster into a canonical collection through a lightweight review dialog.

## Changes

### packages/core — Clustering module

- `src/clustering/hdbscan.ts`: Full HDBSCAN density clustering implementation
  - Mutual reachability distance computation
  - Prim's MST on mutual reachability graph
  - Single-linkage dendrogram from MST
  - Condensed tree extraction + Excess of Mass (EOM) stability-based cluster selection
  - Deterministic, automatic cluster count, allows noise points
- `src/clustering/naming.ts`: Zero-dependency cluster naming
  - Topic frequency × 3 weighting + high-frequency description words
  - Cross-cluster token deduplication (larger clusters get priority)
  - Fallback to `cluster-N` when no tokens available
- `src/clustering/index.ts`: Module exports
- `src/index.ts`: Re-exports clustering module
- `src/clustering/clustering.test.ts`: 13 unit tests (7 HDBSCAN + 6 naming)

### packages/db — BulkOperationSource extension

- `src/bulk-operations.ts`: Added `'promotion'` to `BulkOperationSource` type union and validation set

### supabase — Migration

- `migrations/20260725120000_bulk_operations_promotion_source.sql`: Extends `bulk_operations.source` CHECK constraint to include `'promotion'`

### apps/web — UI layer

- `src/data/use-star-map-clusters.ts`: Hook consuming embeddings → hdbscan → nameClusters → 2D centroids
- `src/data/use-star-map-projection.ts`: Exposed raw embeddings in return type for cluster hook consumption
- `src/data/use-bulk-operations.ts`: Extended create mutation to accept optional `source` parameter
- `src/components/star-map-canvas.ts`: Added cluster area rendering layer (dashed circles + labels + hover highlight) and `pickCluster` method
- `src/components/star-map-view.tsx`: Added cluster props, hover state, and promotion entry card
- `src/components/promotion-review-dialog.tsx`: Lightweight review dialog (rename, remove repos, confirm)
- `src/components/browse-repo-list.tsx`: Pass cluster props through to StarMapView
- `src/pages/browse.tsx`: Wire useStarMapClusters, promotion state, PromotionReviewDialog, createCollection + bulk operation flow
- `src/i18n/locales/en.json`: Added `browse.starMap.{clusterCount,promote}` + `promotion.*` (7 keys)
- `src/i18n/locales/zh-CN.json`: Chinese translations for the same keys

## Design decisions

- **HDBSCAN over k-means**: No preset k needed, handles irregular cluster shapes, deterministic given fixed inputs, naturally identifies noise/outlier points
- **Condensed tree + EOM**: Root node excluded from stability competition to prevent consuming all sub-clusters
- **"Quiet mirror" personality**: System never proactively suggests promotion; user must hover a cluster and explicitly click
- **Promotion flow**: Create collection → BulkOperation with `source: 'promotion'` → existing bulk executor resumes

## Test results

- `packages/core`: 185 tests passed (172 existing + 13 new clustering)
- `packages/db`: 65 tests passed
- `pnpm typecheck`: All 9 packages pass
- `pnpm lint`: 0 errors (38 pre-existing warnings, all `noNonNullAssertion` in hot loops)

## Closure (2026-07-26)

Full gates re-verified before closing GitHub #22: `pnpm lint / typecheck / test` (core 185 / db 65 / functions 94 / web 170) and `pnpm build` all green (build carries only the pre-existing main-chunk size warning). Issue closed with the acceptance summary; implementation commits `647226c` + follow-up fix `4a36fd2`. See `2026-07-26-retrieval-first-series-closure.md`.
