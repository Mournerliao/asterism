import type { StarredRepoRecord } from '@asterism/db';
import type { MouseEvent, PointerEvent } from 'react';

export interface CollectionDialGripController {
  activeRepoId?: string;
  onPickup: (record: StarredRepoRecord, event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown: (record: StarredRepoRecord, event: PointerEvent<HTMLButtonElement>) => void;
}
