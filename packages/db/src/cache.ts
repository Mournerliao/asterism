import type { Repo } from '@asterism/core';
import Dexie, { type Table } from 'dexie';

/** 缓存中的仓库记录：领域 `Repo` + 当前用户的 starredAt（用于离线浏览与排序）。 */
export interface CachedRepo extends Repo {
  starredAt: string | null;
}

/**
 * 本地离线缓存（IndexedDB via Dexie）。Postgres 仍是 source-of-truth，这里只做
 * 下行缓存以支撑离线浏览与即时读取。
 */
export class AsterismCache extends Dexie {
  repos!: Table<CachedRepo, number>;

  constructor() {
    super('asterism-cache');
    this.version(1).stores({
      repos: '&githubId, language, pushedAt',
    });
    this.version(2).stores({
      repos: '&githubId, language, pushedAt, starredAt',
    });
  }
}
