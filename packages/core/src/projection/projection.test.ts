import { describe, expect, it } from 'vitest';
import { pca2d, projectAndNormalize, robustNormalizeLayout } from './index';

/** Deterministic Gaussian blobs in D-dim (same as prototype synthetic-vectors). */
function makeSyntheticVectors(count: number, dim: number, clusters: number): number[][] {
  let seed = 0x51617a >>> 0;
  const rng = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const normalize = (vec: number[]) => {
    let sum = 0;
    for (const v of vec) sum += v * v;
    const norm = Math.sqrt(sum) || 1;
    return vec.map((v) => v / norm);
  };

  const centers: number[][] = [];
  for (let c = 0; c < clusters; c += 1) {
    const center = Array.from({ length: dim }, () => gaussian());
    centers.push(normalize(center));
  }

  const vectors: number[][] = [];
  for (let i = 0; i < count; i += 1) {
    const c = Math.floor(rng() * clusters) % clusters;
    const center = centers[c]!;
    const vec = center.map((v) => v + gaussian() * 0.34);
    vectors.push(normalize(vec));
  }
  return vectors;
}

describe('pca2d', () => {
  it('returns empty array for empty input', () => {
    expect(pca2d([], 384)).toEqual([]);
  });

  it('projects N vectors to N 2D points', () => {
    const vectors = makeSyntheticVectors(100, 384, 4);
    const points = pca2d(vectors, 384);
    expect(points).toHaveLength(100);
    for (const p of points) {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('is deterministic: same input → bit-identical output', () => {
    const vectors = makeSyntheticVectors(200, 384, 6);
    const first = pca2d(vectors, 384);
    const second = pca2d(vectors, 384);
    expect(first).toEqual(second);
  });

  it('preserves cluster structure (intra-cluster variance < inter-cluster)', () => {
    const dim = 384;
    const clusters = 4;
    const perCluster = 50;
    let seed = 123 >>> 0;
    const rng = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const gaussian = () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const centers: number[][] = [];
    for (let c = 0; c < clusters; c += 1) {
      const center = Array.from({ length: dim }, () => gaussian());
      const norm = Math.sqrt(center.reduce((s, v) => s + v * v, 0)) || 1;
      centers.push(center.map((v) => v / norm));
    }
    const vectors: number[][] = [];
    const labels: number[] = [];
    for (let c = 0; c < clusters; c += 1) {
      for (let i = 0; i < perCluster; i += 1) {
        const vec = centers[c]!.map((v) => v + gaussian() * 0.2);
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
        vectors.push(vec.map((v) => v / norm));
        labels.push(c);
      }
    }

    const points = pca2d(vectors, dim);
    const centroids = Array.from({ length: clusters }, () => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < points.length; i += 1) {
      const c = centroids[labels[i]!]!;
      c.x += points[i]!.x;
      c.y += points[i]!.y;
      c.n += 1;
    }
    for (const c of centroids) {
      c.x /= c.n;
      c.y /= c.n;
    }

    let intraSum = 0;
    for (let i = 0; i < points.length; i += 1) {
      const c = centroids[labels[i]!]!;
      const dx = points[i]!.x - c.x;
      const dy = points[i]!.y - c.y;
      intraSum += dx * dx + dy * dy;
    }
    const intra = intraSum / points.length;

    let interSum = 0;
    let interCount = 0;
    for (let a = 0; a < clusters; a += 1) {
      for (let b = a + 1; b < clusters; b += 1) {
        const dx = centroids[a]!.x - centroids[b]!.x;
        const dy = centroids[a]!.y - centroids[b]!.y;
        interSum += dx * dx + dy * dy;
        interCount += 1;
      }
    }
    const inter = interSum / interCount;

    expect(intra).toBeLessThan(inter);
  });
});

describe('robustNormalizeLayout', () => {
  it('returns empty for empty input', () => {
    expect(robustNormalizeLayout([])).toEqual([]);
  });

  it('returns center for single point', () => {
    expect(robustNormalizeLayout([{ x: 42, y: -7 }])).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  it('maps all points into [0,1]²', () => {
    const vectors = makeSyntheticVectors(500, 384, 6);
    const raw = pca2d(vectors, 384);
    const normalized = robustNormalizeLayout(raw);
    for (const p of normalized) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it('resists outlier domination (interior points use more canvas)', () => {
    const points = [
      ...Array.from({ length: 98 }, (_, i) => ({
        x: (i % 10) * 0.1,
        y: Math.floor(i / 10) * 0.1,
      })),
      { x: 100, y: 100 },
      { x: -100, y: -100 },
    ];
    const normalized = robustNormalizeLayout(points);
    const interior = normalized.slice(0, 98);
    const xRange = Math.max(...interior.map((p) => p.x)) - Math.min(...interior.map((p) => p.x));
    expect(xRange).toBeGreaterThan(0.5);
  });
});

describe('projectAndNormalize', () => {
  it('produces [0,1]² points from raw vectors', () => {
    const vectors = makeSyntheticVectors(100, 384, 4);
    const points = projectAndNormalize(vectors, 384);
    expect(points).toHaveLength(100);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic end-to-end', () => {
    const vectors = makeSyntheticVectors(150, 384, 5);
    const first = projectAndNormalize(vectors, 384);
    const second = projectAndNormalize(vectors, 384);
    expect(first).toEqual(second);
  });
});
