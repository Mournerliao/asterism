import type { Repo } from '@asterism/core';
import Dexie, { type Table } from 'dexie';

/**
 * 本地离线缓存（IndexedDB via Dexie）。Postgres 仍是 source-of-truth，这里只做
 * 下行缓存以支撑离线浏览与即时读取。schema 为 Phase 0 占位，Phase 1 同步功能落地时细化。
 */
export class AsterismCache extends Dexie {
  repos!: Table<Repo, number>;

  constructor() {
    super('asterism-cache');
    this.version(1).stores({
      repos: '&githubId, language, pushedAt',
    });
  }
}
