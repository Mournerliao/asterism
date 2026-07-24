// PROTOTYPE — throwaway (#21 石墨语义星图 spike). Delete once the verdict is captured.
//
// Dev-only "spike lab" that resolves the two open technical unknowns from ADR 0026 §7
// (see .scratch/retrieval-first/04-graphite-semantic-star-map.md, line 137):
//   Q1 deterministic projection — PCA vs deterministic-refine vs random-force (anti-pattern)
//   Q2 layered rendering + tech threshold — Canvas2D density→individual, FPS at N up to 5000
//
// This is throwaway: plain English labels (no i18n), no tests, minimal error handling.
// Run: `pnpm --filter @asterism/web dev` → open /dev/star-map-prototype
import { useTheme } from '@asterism/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deterministicRefine,
  type Point2D,
  pca2d,
  projectionDelta,
  randomForce2d,
} from './projection';
import { type Camera, type InteractionState, StarCanvas } from './star-canvas';
import { makeSyntheticVectors } from './synthetic-vectors';

type Method = 'pca' | 'refine' | 'random';

const EXPENSIVE_CAP = 2000; // refine/random do exact kNN → cap N to stay interactive

function project(method: Method, vectors: Float32Array[], dim: number, seed: number): Point2D[] {
  if (method === 'pca') {
    return pca2d(vectors, dim);
  }
  if (method === 'refine') {
    return deterministicRefine(vectors, dim);
  }
  return randomForce2d(vectors, dim, seed);
}

export function StarMapPrototypePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarCanvas | null>(null);
  const cameraRef = useRef<Camera>({ scale: 1, panX: 0, panY: 0 });
  const interactionRef = useRef<InteractionState>({
    hitSet: new Set(),
    neighborSet: new Set(),
    selected: null,
    hovered: null,
    reducedMotion: false,
    showRegions: false,
  });

  const [method, setMethod] = useState<Method>('pca');
  const [count, setCount] = useState(1200);
  const [clusters, setClusters] = useState(8);
  const [showRegions, setShowRegions] = useState(false);
  const [search, setSearch] = useState('');
  const [computing, setComputing] = useState(false);
  const [fps, setFps] = useState(0);
  const [mode, setMode] = useState<'density' | 'individual'>('individual');
  const [visible, setVisible] = useState(0);
  const [delta, setDelta] = useState<{ max: number; rms: number } | null>(null);
  const [seed, setSeed] = useState(1);
  const [projectMs, setProjectMs] = useState(0);

  const effectiveCount = method === 'pca' ? count : Math.min(count, EXPENSIVE_CAP);

  const dataset = useMemo(
    () => makeSyntheticVectors({ count: effectiveCount, clusters, seed: 0x51617a }),
    [effectiveCount, clusters],
  );

  const pointsRef = useRef<Point2D[]>([]);

  // Recompute the projection whenever inputs change; measure wall time and,
  // for the same method+seed, prove determinism by reprojecting and diffing.
  useEffect(() => {
    let cancelled = false;
    setComputing(true);
    const handle = window.setTimeout(() => {
      const start = performance.now();
      const points = project(method, dataset.vectors, dataset.dim, seed);
      const elapsed = performance.now() - start;
      if (cancelled) {
        return;
      }
      const second =
        method === 'random'
          ? project(method, dataset.vectors, dataset.dim, seed + 1) // fresh session → fresh seed
          : project(method, dataset.vectors, dataset.dim, seed); // deterministic → identical
      pointsRef.current = points;
      engineRef.current?.setModel({ points, labels: dataset.labels });
      interactionRef.current.selected = null;
      interactionRef.current.hitSet = new Set();
      interactionRef.current.neighborSet = new Set();
      setDelta(projectionDelta(points, second));
      setProjectMs(elapsed);
      setComputing(false);
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [method, dataset, seed]);

  // Canvas engine + steady rAF loop (redraws every frame to measure render cost).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const engine = new StarCanvas(canvas);
    engineRef.current = engine;
    engine.resize();
    engine.setModel({ points: pointsRef.current, labels: dataset.labels });
    interactionRef.current.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let raf = 0;
    let frames = 0;
    let acc = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      frames += 1;
      if (acc >= 400) {
        setFps(Math.round((frames * 1000) / acc));
        setMode(engine.lastMode);
        setVisible(engine.lastVisibleCount);
        frames = 0;
        acc = 0;
      }
      engine.draw(cameraRef.current, interactionRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [dataset.labels]);

  useEffect(() => {
    if (resolvedTheme) {
      engineRef.current?.readTokens();
    }
  }, [resolvedTheme]);

  useEffect(() => {
    interactionRef.current.showRegions = showRegions;
  }, [showRegions]);

  // "Light up a path": search by cluster id lights every member of that cluster.
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === '') {
      interactionRef.current.hitSet = new Set();
      return;
    }
    const target = trimmed.toLowerCase() === 'iso' ? -1 : Number.parseInt(trimmed, 10);
    const hits = new Set<number>();
    if (!Number.isNaN(target)) {
      dataset.labels.forEach((label, index) => {
        if (label === target) {
          hits.add(index);
        }
      });
    }
    interactionRef.current.hitSet = hits;
  }, [search, dataset.labels]);

  const onPointer = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const picked = engine.pick(event.clientX - rect.left, event.clientY - rect.top);
    interactionRef.current.hovered = picked;
  }, []);

  const onClick = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (!engine || !canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const picked = engine.pick(event.clientX - rect.left, event.clientY - rect.top);
      interactionRef.current.selected = picked;
      // Light the selected star's cluster as its semantic "path".
      const path = new Set<number>();
      if (picked != null) {
        const label = dataset.labels[picked];
        dataset.labels.forEach((value, index) => {
          if (value === label && value >= 0) {
            path.add(index);
          }
        });
      }
      interactionRef.current.neighborSet = path;
    },
    [dataset.labels],
  );

  const onWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    camera.scale = Math.min(24, Math.max(0.5, camera.scale * factor));
  }, []);

  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const onDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);
  const onMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      onPointer(event);
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      cameraRef.current.panX += event.clientX - drag.x;
      cameraRef.current.panY += event.clientY - drag.y;
      dragRef.current = { x: event.clientX, y: event.clientY };
    },
    [onPointer],
  );
  const onUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const resetCamera = useCallback(() => {
    cameraRef.current = { scale: 1, panX: 0, panY: 0 };
  }, []);

  const deterministic = delta != null && delta.max < 1e-9;

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="asterism-glass-surface flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-caption">
        <span className="rounded bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground text-micro">
          PROTOTYPE
        </span>
        <strong className="text-body">石墨语义星图 · #21 spike</strong>
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Projection</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2"
            value={method}
            onChange={(event) => setMethod(event.target.value as Method)}
          >
            <option value="pca">PCA (deterministic)</option>
            <option value="refine">PCA + refine (deterministic)</option>
            <option value="random">Random force (anti-pattern)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">N</span>
          <input
            type="range"
            min={100}
            max={5000}
            step={100}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
          <span className="w-10 font-mono text-right tabular-nums">{effectiveCount}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Clusters</span>
          <input
            type="range"
            min={2}
            max={16}
            step={1}
            value={clusters}
            onChange={(event) => setClusters(Number(event.target.value))}
          />
          <span className="w-6 font-mono text-right tabular-nums">{clusters}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Light path (cluster id / "iso")</span>
          <input
            className="h-8 w-28 rounded-md border border-input bg-background px-2"
            value={search}
            placeholder="e.g. 3"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showRegions}
            onChange={(event) => setShowRegions(event.target.checked)}
          />
          <span className="text-muted-foreground">Region layer (#22)</span>
        </label>
        <button
          type="button"
          className="h-8 rounded-md border border-input px-2.5 hover:bg-accent"
          onClick={() => setSeed((value) => value + 1)}
        >
          Reproject
        </button>
        <button
          type="button"
          className="h-8 rounded-md border border-input px-2.5 hover:bg-accent"
          onClick={resetCamera}
        >
          Reset view
        </button>
        <button
          type="button"
          className="h-8 rounded-md border border-input px-2.5 hover:bg-accent"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      <div className="flex items-center gap-x-5 gap-y-1 border-b px-4 py-1.5 font-mono text-micro text-muted-foreground">
        <span>
          FPS <strong className="text-foreground">{fps}</strong>
        </span>
        <span>
          render <strong className="text-foreground">{mode}</strong>
        </span>
        <span>
          visible <strong className="text-foreground tabular-nums">{visible}</strong>
        </span>
        <span>
          project <strong className="text-foreground tabular-nums">{projectMs.toFixed(0)}ms</strong>
        </span>
        <span>
          reproject Δmax{' '}
          <strong className={deterministic ? 'text-success' : 'text-warning'}>
            {delta ? delta.max.toExponential(2) : '—'}
          </strong>{' '}
          {delta ? (deterministic ? '· stable ✓' : '· scrambles ✗') : ''}
        </span>
        {computing ? <span className="text-warning">computing…</span> : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onWheel={onWheel}
          onClick={onClick}
        />
        <p className="pointer-events-none absolute bottom-3 left-4 max-w-md text-micro text-muted-foreground">
          Drag to pan · wheel to zoom. Far view = density field, zoom in for individual nodes. The
          list view (not shown here) is the accessibility-equivalent path in the real feature.
        </p>
      </div>
    </div>
  );
}
