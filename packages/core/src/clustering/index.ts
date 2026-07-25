/**
 * Clustering module: HDBSCAN density clustering + zero-dependency naming.
 * Used by the emergent clusters feature (#22) to derive semantic "area regions"
 * on the star map from 384-dim embedding vectors.
 *
 * ADR 0026 §8: pure vector density clustering, no preset k, noise allowed.
 */

export type { HdbscanOptions, HdbscanResult } from './hdbscan';
export { hdbscan } from './hdbscan';
export type { ClusterLabel, ClusterNameInput } from './naming';
export { nameCluster, nameClusters } from './naming';
