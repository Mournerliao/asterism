/**
 * Production Canvas2D layered renderer for the Graphite Semantic Star Map (#21).
 *
 * Implements ADR 0026 §7 anti-slop laws:
 *   #1 Stars are restrained graphite nodes; only hit/neighbor/selected get electric blue.
 *   #3 Scale via layering: far = density field; near = individual nodes; viewport-culled.
 *   #4 Search = "light up a path": hits rise, everyone else sinks.
 *
 * No glow, no noise. Colors from live Graphite Glass CSS tokens.
 */

import type { StarMapPoint } from '../data/use-star-map-projection';

export interface Camera {
  scale: number;
  panX: number;
  panY: number;
}

export interface StarMapInteraction {
  hitSet: Set<string>;
  neighborSet: Set<string>;
  selectedRepoId: string | null;
  hoveredIndex: number | null;
  reducedMotion: boolean;
}

interface Tokens {
  background: string;
  node: string;
  primary: string;
  foreground: string;
}

const INDIVIDUAL_CAP = 900;
const GRID = 72;

function readToken(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

function toRgb(color: string, fallback: string): string {
  if (!color) return fallback;
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

export class StarMapCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private points: StarMapPoint[] = [];
  private tokens: Tokens;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private screen: Float64Array = new Float64Array(0);
  lastVisibleCount = 0;
  lastMode: 'density' | 'individual' = 'individual';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas2D unavailable');
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
    };
    this.tokens = tokens;
    return tokens;
  }

  setPoints(points: StarMapPoint[]): void {
    this.points = points;
    this.screen = new Float64Array(points.length * 2);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  private worldToScreen(x: number, y: number, camera: Camera): [number, number] {
    const span = Math.min(this.width, this.height) * 0.92;
    const sx = (x - 0.5) * span * camera.scale + this.width / 2 + camera.panX;
    const sy = (y - 0.5) * span * camera.scale + this.height / 2 + camera.panY;
    return [sx, sy];
  }

  pick(screenX: number, screenY: number): number | null {
    let best: number | null = null;
    let bestDist = 14 * 14;
    for (let i = 0; i < this.points.length; i += 1) {
      const sx = this.screen[i * 2] ?? 0;
      const sy = this.screen[i * 2 + 1] ?? 0;
      if (Number.isNaN(sx)) continue;
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

  draw(camera: Camera, state: StarMapInteraction): void {
    const ctx = this.ctx;
    const { points } = this;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = this.tokens.background;
    ctx.fillRect(0, 0, this.width, this.height);

    const visible: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      if (!p) continue;
      const [sx, sy] = this.worldToScreen(p.x, p.y, camera);
      this.screen[i * 2] = sx;
      this.screen[i * 2 + 1] = sy;
      if (sx >= -20 && sx <= this.width + 20 && sy >= -20 && sy <= this.height + 20) {
        visible.push(i);
      }
    }
    this.lastVisibleCount = visible.length;

    const hasSearch = state.hitSet.size > 0;
    const repoIdAt = (i: number) => points[i]?.repoId ?? '';
    const isLit = (i: number) => state.hitSet.has(repoIdAt(i));
    const isDim = (i: number) => hasSearch && !isLit(i) && !state.neighborSet.has(repoIdAt(i));

    if (visible.length > INDIVIDUAL_CAP) {
      this.lastMode = 'density';
      this.drawDensity(visible);
    } else {
      this.lastMode = 'individual';
      for (const i of visible) {
        if (
          isLit(i) ||
          repoIdAt(i) === state.selectedRepoId ||
          state.neighborSet.has(repoIdAt(i))
        ) {
          continue;
        }
        const sx = this.screen[i * 2] ?? 0;
        const sy = this.screen[i * 2 + 1] ?? 0;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.tokens.node},${isDim(i) ? 0.12 : 0.5})`;
        ctx.fill();
      }
    }

    for (const i of visible) {
      if (state.neighborSet.has(repoIdAt(i)) && !isLit(i)) {
        this.node(
          this.screen[i * 2] ?? 0,
          this.screen[i * 2 + 1] ?? 0,
          2.6,
          `rgba(${this.tokens.primary},0.4)`,
        );
      }
    }
    for (const i of visible) {
      if (isLit(i)) {
        this.node(
          this.screen[i * 2] ?? 0,
          this.screen[i * 2 + 1] ?? 0,
          3.4,
          `rgba(${this.tokens.primary},0.95)`,
        );
      }
    }
    if (state.selectedRepoId != null) {
      for (let i = 0; i < points.length; i += 1) {
        if (points[i]?.repoId === state.selectedRepoId) {
          const sx = this.screen[i * 2] ?? 0;
          const sy = this.screen[i * 2 + 1] ?? 0;
          if (!Number.isNaN(sx)) {
            this.node(sx, sy, 4.2, `rgba(${this.tokens.primary},1)`);
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${this.tokens.primary},0.6)`;
            ctx.lineWidth = 1.25;
            ctx.stroke();
          }
          break;
        }
      }
    }
    if (state.hoveredIndex != null && points[state.hoveredIndex]?.repoId !== state.selectedRepoId) {
      const sx = this.screen[state.hoveredIndex * 2] ?? 0;
      const sy = this.screen[state.hoveredIndex * 2 + 1] ?? 0;
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

  private drawDensity(visible: number[]): void {
    const ctx = this.ctx;
    const cell = Math.max(this.width, this.height) / GRID;
    const cols = Math.ceil(this.width / cell) + 1;
    const rows = Math.ceil(this.height / cell) + 1;
    const counts = new Float32Array(cols * rows);
    let peak = 1;
    for (const i of visible) {
      const cx = Math.floor((this.screen[i * 2] ?? 0) / cell);
      const cy = Math.floor((this.screen[i * 2 + 1] ?? 0) / cell);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      const idx = cy * cols + cx;
      counts[idx] = (counts[idx] ?? 0) + 1;
      if ((counts[idx] ?? 0) > peak) peak = counts[idx] ?? 0;
    }
    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        const count = counts[cy * cols + cx] ?? 0;
        if (count === 0) continue;
        const intensity = Math.sqrt(count / peak);
        ctx.fillStyle = `rgba(${this.tokens.node},${0.08 + intensity * 0.34})`;
        ctx.fillRect(cx * cell, cy * cell, cell + 0.6, cell + 0.6);
      }
    }
  }
}
