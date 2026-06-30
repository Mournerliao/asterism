import type { RepoId } from './repo';

/**
 * 仓库笔记（对齐 data-model.md 的 `notes` 表）：每用户每仓库至多一条。
 */
export interface Note {
  repoId: RepoId;
  body: string;
}
