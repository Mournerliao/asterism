import { useTheme } from '@asterism/ui';
import { LoaderCircleIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarMapPoint } from '../data/use-star-map-projection';
import { EmptyState } from './empty-state';
import { type Camera, StarMapCanvas, type StarMapInteraction } from './star-map-canvas';

export interface StarMapViewProps {
  points: StarMapPoint[];
  repoIdToIndex: Map<string, number>;
  isLoading: boolean;
  hitRepoIds: Set<string>;
  neighborRepoIds: Set<string>;
  selectedRepoId?: string;
  onSelectRepo?: (repoId: string | null) => void;
  embeddingReady: boolean;
  active: boolean;
}

export const StarMapView = memo(function StarMapView({
  points,
  isLoading,
  hitRepoIds,
  neighborRepoIds,
  selectedRepoId,
  onSelectRepo,
  embeddingReady,
  active,
}: StarMapViewProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarMapCanvas | null>(null);
  const cameraRef = useRef<Camera>({ scale: 1, panX: 0, panY: 0 });
  const interactionRef = useRef<StarMapInteraction>({
    hitSet: new Set(),
    neighborSet: new Set(),
    selectedRepoId: null,
    hoveredIndex: null,
    reducedMotion: false,
  });

  useEffect(() => {
    interactionRef.current.hitSet = hitRepoIds;
  }, [hitRepoIds]);

  useEffect(() => {
    interactionRef.current.neighborSet = neighborRepoIds;
  }, [neighborRepoIds]);

  useEffect(() => {
    interactionRef.current.selectedRepoId = selectedRepoId ?? null;
  }, [selectedRepoId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    let engine = engineRef.current;
    if (!engine) {
      engine = new StarMapCanvas(canvas);
      engineRef.current = engine;
    }
    engine.resize();
    engine.setPoints(points);
    interactionRef.current.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let raf = 0;
    const loop = () => {
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
  }, [points, active]);

  useEffect(() => {
    if (resolvedTheme) {
      engineRef.current?.readTokens();
    }
  }, [resolvedTheme]);

  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (engine && canvas) {
      const rect = canvas.getBoundingClientRect();
      interactionRef.current.hoveredIndex = engine.pick(
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    }
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.abs(event.clientX - drag.x) > 4 || Math.abs(event.clientY - drag.y) > 4) {
      didDragRef.current = true;
    }
    cameraRef.current.panX += event.clientX - drag.x;
    cameraRef.current.panY += event.clientY - drag.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onClick = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (didDragRef.current) return;
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (!engine || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const picked = engine.pick(event.clientX - rect.left, event.clientY - rect.top);
      if (picked != null && points[picked]) {
        onSelectRepo?.(points[picked].repoId);
      } else {
        onSelectRepo?.(null);
      }
    },
    [points, onSelectRepo],
  );

  const onWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    cameraRef.current.scale = Math.min(24, Math.max(0.5, cameraRef.current.scale * factor));
  }, []);

  if (!embeddingReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title={t('browse.starMap.emptyTitle')}
          description={t('browse.starMap.emptyDescription')}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
        <span className="text-caption">{t('browse.starMap.projecting')}</span>
      </div>
    );
  }

  return (
    <div
      className="relative h-full min-h-[400px] w-full"
      role="img"
      aria-label={t('browse.starMap.label')}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onClick={onClick}
      />
      <p className="pointer-events-none absolute bottom-3 left-4 max-w-md text-micro text-muted-foreground">
        {t('browse.starMap.panHint')}
      </p>
    </div>
  );
});
