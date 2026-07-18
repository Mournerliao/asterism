# 0013 · 移除 Dexie 离线缓存

- Status: Accepted
- Date: 2026-07-18

Asterism 当前不承诺离线浏览，也不采用 Dexie 作为 Web 数据层。Postgres 是唯一持久化 source-of-truth，所有持久数据访问继续经 `packages/db`，TanStack Query 只提供会话内请求缓存；现有未接入的 `AsterismCache`、Dexie 依赖与相关导出应删除。离线能力会引入缓存新鲜度、用户切换隔离、登出清理和 schema 迁移成本，而当前没有足够产品需求；未来扩展或桌面端若出现明确离线场景，应作为新能力重新设计，而不是预留未使用的数据层。
