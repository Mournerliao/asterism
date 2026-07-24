// PROTOTYPE — throwaway (#21 石墨语义星图 spike). Delete once the verdict is captured.
//
// Layered Canvas2D renderer answering ADR 0026 §7 anti-slop laws #1/#3/#4:
//   #1 stars are restrained graphite nodes; only hit / neighbor / selected get electric blue.
//   #3 scale via layering: far view = density field (few hundred cell fills), near view =
//      individual nodes; viewport-culled; NEVER thousands of arc() calls per frame.
//   #4 search = "light up a path": hits rise to primary, everyone else sinks to graphite.
// No glow, no noise — colors are pulled from the live Graphite Glass tokens.

import type { Point2D } from './projection';

export interface StarModel {
  points: Point2D[]; // normalized to [0,1]²
  labels: number[]; // ground-truth cluster id (region-layer placeholder for #22)
}

export interface Camera {
  scale: number; // 1 = whole map fits; >1 zoomed in
  panX: number; // screen px
  panY: number;
}

export interface InteractionState {
  hitSet: Set<number>; // search "path" — lit
  neighborSet: Set<number>;
  selected: number | null;
  hovered: number | null;
  reducedMotion: boolean;
  showRegions: boolean; // faint region hint reserved for #22
}

interface Tokens {
  background: string;
  node: string; // muted graphite (rgb triplet)
  primary: string; // electric blue (rgb triplet)
  foreground: string;
  border: string;
}

const INDIVIDUAL_CAP = 900; // above this many visible points → density field
const GRID = 72; // density bins per axis

function readToken(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

// Resolve a CSS color token to an "r,g,b" triplet so we can vary alpha on the canvas.
function toRgb(color: string, fallback: string): string {
  if (!color) {
    return fallback;
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `${r},${g},${b}`;
  }
  const match = color.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return match ? `${match[1]},${match[2]},${match[3]}` : fallback;
}

export class StarCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private model: StarModel = { points: [], labels: [] };
  private tokens: Tokens;
  private width = 0;
  private height = 0;
  private dpr = 1;
  /** last frame's screen-space positions, for hit testing. */
  private screen: Float64Array = new Float64Array(0);
  lastVisibleCount = 0;
  lastMode: 'density' | 'individual' = 'individual';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas2D unavailable');
    }
    this.ctx = ctx;
    this.tokens = this.readTokens();
  }

  readTokens(): Tokens {
    const styles = getComputedStyle(document.documentElement);
    const tokens: Tokens = {
      background: readToken(styles, '--background') || '#0b0e13',
      node: toRgb(readToken(styles, '--muted-foreground'), '154,163,175'),
      primary: toRgb(readToken(styles, '--primary'), '37,99,235'),
      foreground: toRgb(readToken(styles, '--foreground'), '242,244,247'),
      border: toRgb(readToken(styles, '--border'), '42,48,58'),
    };
    this.tokens = tokens;
    return tokens;
  }

  setModel(model: StarModel): void {
    this.model = model;
    this.screen = new Float64Array(model.points.length * 2);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  private worldToScreen(p: Point2D, camera: Camera): [number, number] {
    const span = Math.min(this.width, this.height) * 0.92;
    const sx = (p.x - 0.5) * span * camera.scale + this.width / 2 + camera.panX;
    const sy = (p.y - 0.5) * span * camera.scale + this.height / 2 + camera.panY;
    return [sx, sy];
  }

  pick(screenX: number, screenY: number): number | null {
    let best: number | null = null;
    let bestDist = 14 * 14;
    for (let i = 0; i < this.model.points.length; i += 1) {
      const sx = this.screen[i * 2]!;
      const sy = this.screen[i * 2 + 1]!;
      if (Number.isNaN(sx)) {
        continue;
      }
      const dx = sx - screenX;
      const dy = sy - screenY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  draw(camera: Camera, state: InteractionState): void {
    const ctx = this.ctx;
    const { points } = this.model;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = this.tokens.background;
    ctx.fillRect(0, 0, this.width, this.height);

    // Pass 1: world→screen + viewport cull.
    const visible: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const [sx, sy] = this.worldToScreen(points[i]!, camera);
      this.screen[i * 2] = sx;
      this.screen[i * 2 + 1] = sy;
      if (sx >= -20 && sx <= this.width + 20 && sy >= -20 && sy <= this.height + 20) {
        visible.push(i);
      }
    }
    this.lastVisibleCount = visible.length;

    const hasSearch = state.hitSet.size > 0;
    const lit = (i: number) => state.hitSet.has(i);
    const dim = (i: number) => hasSearch && !lit(i) && !state.neighborSet.has(i);

    if (state.showRegions) {
      this.drawRegions(camera);
    }

    if (visible.length > INDIVIDUAL_CAP) {
      this.lastMode = 'density';
      this.drawDensity(visible);
    } else {
      this.lastMode = 'individual';
      ctx.globalCompositeOperation = 'source-over';
      for (const i of visible) {
        if (lit(i) || i === state.selected || state.neighborSet.has(i)) {
          continue; // drawn on top afterwards
        }
        const sx = this.screen[i * 2]!;
        const sy = this.screen[i * 2 + 1]!;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.tokens.node},${dim(i) ? 0.12 : 0.5})`;
        ctx.fill();
      }
    }

    // Lit path + neighbors + selection always drawn as individual nodes on top
    // (bounded set — search hits are few), so "light up a path" reads at any scale.
    for (const i of visible) {
      if (state.neighborSet.has(i) && !lit(i)) {
        this.node(
          this.screen[i * 2]!,
          this.screen[i * 2 + 1]!,
          2.6,
          `rgba(${this.tokens.primary},0.4)`,
        );
      }
    }
    for (const i of visible) {
      if (lit(i)) {
        this.node(
          this.screen[i * 2]!,
          this.screen[i * 2 + 1]!,
          3.4,
          `rgba(${this.tokens.primary},0.95)`,
        );
      }
    }
    if (state.selected != null) {
      const sx = this.screen[state.selected * 2]!;
      const sy = this.screen[state.selected * 2 + 1]!;
      if (!Number.isNaN(sx)) {
        this.node(sx, sy, 4.2, `rgba(${this.tokens.primary},1)`);
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.tokens.primary},0.6)`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }
    if (state.hovered != null && state.hovered !== state.selected) {
      const sx = this.screen[state.hovered * 2]!;
      const sy = this.screen[state.hovered * 2 + 1]!;
      if (!Number.isNaN(sx)) {
        this.node(sx, sy, 3, `rgba(${this.tokens.foreground},0.85)`);
      }
    }
    ctx.restore();
  }

  private node(x: number, y: number, r: number, fill: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // Far view: bin visible points into a grid and shade cells by count (graphite).
  // O(cells) fills instead of O(points) arcs — this is how scale is met.
  private drawDensity(visible: number[]): void {
    const ctx = this.ctx;
    const cell = Math.max(this.width, this.height) / GRID;
    const cols = Math.ceil(this.width / cell) + 1;
    const rows = Math.ceil(this.height / cell) + 1;
    const counts = new Float32Array(cols * rows);
    let peak = 1;
    for (const i of visible) {
      const cx = Math.floor(this.screen[i * 2]! / cell);
      const cy = Math.floor(this.screen[i * 2 + 1]! / cell);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) {
        continue;
      }
      const idx = cy * cols + cx;
      counts[idx] = counts[idx]! + 1;
      if (counts[idx]! > peak) {
        peak = counts[idx]!;
      }
    }
    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        const count = counts[cy * cols + cx]!;
        if (count === 0) {
          continue;
        }
        const intensity = Math.sqrt(count / peak);
        ctx.fillStyle = `rgba(${this.tokens.node},${0.08 + intensity * 0.34})`;
        ctx.fillRect(cx * cell, cy * cell, cell + 0.6, cell + 0.6);
      }
    }
  }

  // Region-layer placeholder for #22: faint per-cluster centroid halos, off by default.
  private drawRegions(camera: Camera): void {
    const ctx = this.ctx;
    const { points, labels } = this.model;
    const sums = new Map<number, { x: number; y: number; n: number }>();
    for (let i = 0; i < points.length; i += 1) {
      const label = labels[i]!;
      if (label < 0) {
        continue;
      }
      const point = points[i]!;
      const entry = sums.get(label) ?? { x: 0, y: 0, n: 0 };
      entry.x += point.x;
      entry.y += point.y;
      entry.n += 1;
      sums.set(label, entry);
    }
    for (const entry of sums.values()) {
      const [sx, sy] = this.worldToScreen({ x: entry.x / entry.n, y: entry.y / entry.n }, camera);
      const radius = Math.sqrt(entry.n) * 6 * Math.sqrt(camera.scale);
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.tokens.node},0.05)`;
      ctx.fill();
    }
  }
}
