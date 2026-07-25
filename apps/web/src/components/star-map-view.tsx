import { useTheme } from '@asterism/ui';
import { LoaderCircleIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarMapCluster } from '../data/use-star-map-clusters';
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
  clusters: StarMapCluster[];
  clusterByRepo: Map<string, number>;
  onPromoteCluster?: (cluster: StarMapCluster) => void;
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
  clusters,
  clusterByRepo,
  onPromoteCluster,
}: StarMapViewProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarMapCanvas | null>(null);
  const cameraRef = useRef<Camera>({ scale: 1, panX: 0, panY: 0 });
  const [hoveredCluster, setHoveredCluster] = useState<StarMapCluster | null>(null);
  const interactionRef = useRef<StarMapInteraction>({
    hitSet: new Set(),
    neighborSet: new Set(),
    selectedRepoId: null,
    hoveredIndex: null,
    reducedMotion: false,
    clusters: [],
    clusterByRepo: new Map(),
    hoveredClusterId: null,
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
    interactionRef.current.clusters = clusters;
    interactionRef.current.clusterByRepo = clusterByRepo;
  }, [clusters, clusterByRepo]);

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

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (engine && canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        interactionRef.current.hoveredIndex = engine.pick(mx, my);

        const clusterId = engine.pickCluster(mx, my, interactionRef.current);
        interactionRef.current.hoveredClusterId = clusterId;
        const cluster =
          clusterId != null ? (clusters.find((c) => c.clusterId === clusterId) ?? null) : null;
        setHoveredCluster(cluster);
      }
      const drag = dragRef.current;
      if (!drag) return;
      if (Math.abs(event.clientX - drag.x) > 4 || Math.abs(event.clientY - drag.y) > 4) {
        didDragRef.current = true;
      }
      cameraRef.current.panX += event.clientX - drag.x;
      cameraRef.current.panY += event.clientY - drag.y;
      dragRef.current = { x: event.clientX, y: event.clientY };
    },
    [clusters],
  );

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
      {hoveredCluster && onPromoteCluster ? (
        <div className="pointer-events-auto absolute right-4 top-3 flex items-center gap-2 rounded-lg border border-border/50 bg-card/90 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="text-caption font-medium text-foreground">{hoveredCluster.name}</span>
          <span className="text-micro text-muted-foreground">
            {t('browse.starMap.clusterCount', { count: hoveredCluster.repoIds.length })}
          </span>
          <button
            type="button"
            className="ml-2 rounded-md bg-primary/10 px-2 py-1 text-micro font-medium text-primary hover:bg-primary/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onPromoteCluster(hoveredCluster);
            }}
          >
            {t('browse.starMap.promote')}
          </button>
        </div>
      ) : null}
      <p className="pointer-events-none absolute bottom-3 left-4 max-w-md text-micro text-muted-foreground">
        {t('browse.starMap.panHint')}
      </p>
    </div>
  );
});
