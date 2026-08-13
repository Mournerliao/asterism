export const COLLECTION_DIAL_DRAG_THRESHOLD = 7;

export function exceedsCollectionDialDragThreshold(
  origin: { x: number; y: number },
  point: { x: number; y: number },
): boolean {
  return Math.hypot(point.x - origin.x, point.y - origin.y) >= COLLECTION_DIAL_DRAG_THRESHOLD;
}

export function shouldSuppressCollectionDialClick(
  sameSource: boolean,
  now: number,
  suppressUntil: number,
): boolean {
  return sameSource && now <= suppressUntil;
}
