# 2026-07-24 · GitHub #20 隐形混合搜索

## 目标

在 #19 的浏览器内 embedding 运行时之上，把 Browse 的关键词精确命中与语义（向量）近邻融合成**一套排序、零模式开关**（ADR 0026 §7）。查询文本只在浏览器本地嵌成向量，仅向量上送用户自己的 Postgres 做距离检索；原文与笔记永不离开设备。模型未就绪或弱设备时无缝降级为纯关键词排序，绝不阻断既有搜索。

## 实现

- `packages/core` 新增纯函数 `rankHybridRepos`：把单一结果画布拆成 `primary`（关键词 + 筛选命中，完全复用既有 `filterStarredRepos` + `sortStarredRepos` 路径，保证对现有 Browse 零回归）与 `semantic`（未命中关键词但满足同一 facet、且在距离图中的仓库，按距离升序、同距离按 `fullName` 稳定）。无查询词只返回 primary；无距离图或空图直接返回空 semantic——这是「设备/模型未就绪 → 自然退化为纯关键词」的执行点。函数不修改输入。
- `packages/db` 新增 `searchRepoEmbeddings` 与幂等迁移 `20260724130000_search_user_repo_embeddings.sql`：`search_user_repo_embeddings(query_embedding vector(384), match_count int default 24)` 为 `language sql / stable / security invoker / set search_path = ''`，函数体 `where user_id = (select auth.uid())` 并按 pgvector `<=>` 余弦距离排序，`limit least(greatest(coalesce(match_count,24),1),200)` 夹住返回条数；`revoke all from public` + 仅 `grant execute to authenticated`。与 owner 直写路径同构——derived 数据、只影响自己的搜索，无跨用户投毒/泄露面，anon 调用得空集（ADR 0026 §4/§7）。向量以 pgvector 文本字面量往返。
- `apps/web` 单一搜索框接线：`useSemanticNeighbors` 在本地 Worker 嵌入查询（`toQueryInput` 加 e5 `query:` 前缀），queryFn 内 `await import('../lib/embedding-runtime')` 懒加载，保持重型 runtime（Worker + wasm）留在按需 chunk；180ms 防抖后实时重排。仅在 `optedIn && backend !== null` 且有查询词时 `enabled`，否则返回空距离图，由 `rankHybridRepos` 退化为关键词排序。`browse.tsx` 以 `visible = [...primary, ...semantic]` 拼接、`semanticStartIndex` 标记语义段起点。
- 动效与 a11y：语义近邻落在既有列表/卡片画布，语义段在 hairline 分隔线下按 `--ease-out-quart` 200ms `repo-semantic-enter` 浮入，`prefers-reduced-motion: reduce` 下移除动画。虚拟化只覆盖 primary 集，有界语义块（≤ `SEMANTIC_MATCH_COUNT = 24`）静态追加；table 视图把语义分隔行以 `aria-hidden` 的 `<td>` 标注、保持 `aria-rowcount` 诚实且全部结果以连续 `rowindex` 可导航，grid 视图（无 rowcount 契约）以普通节点播报「Related by meaning / 语义相关」标签。
- i18n：`browse.semanticSectionLabel` 补齐 en（`Related by meaning`）/ zh-CN（`语义相关`）。

## 代码审查

以全部工作区改动为固定审查点跑 `/review` 子代理，六个关注领域（RLS 安全、融合正确性、虚拟化索引数学、门控降级、a11y、bundle/perf）**全部 PASS，零发现**。

## TDD 与验证

先红后绿覆盖：

- core：`rankHybridRepos` 覆盖无查询词只 primary、无/空距离图退化、语义按距离升序与稳定排序、facet 过滤与去重、`semanticLimit` 截断（7 测试）。
- db：`searchRepoEmbeddings` 覆盖向量字面量编码、`match_count` 透传/缺省、RPC 名与返回映射、错误传播（10 测试）。
- web：新增 `useSemanticNeighbors` 门控测试锁死隐私契约——未 opt-in / 空查询时**绝不**嵌入、不联网、不派生 Worker；启用时按 e5 `query:` 前缀本地嵌入并把近邻映射为 `distanceByRepoId`（3 测试）。

门禁：`pnpm lint`、`pnpm typecheck`、`pnpm test` 全绿，测试计数 core 162 / db 65 / Supabase Functions 94 / web 170。`pnpm build` 唯一失败是离线环境从固定 revision 下载模型资产的网络超时（`UND_ERR_CONNECT_TIMEOUT`，非代码问题）；已用 `vite build` 验证代码可编译打包（933 模块，主 chunk 约 822 kB）。过程中发现并修复一处自引入回归：`use-semantic-search.ts` 曾静态导入 embedding runtime，触发 `[INEFFECTIVE_DYNAMIC_IMPORT]` 破坏 bootstrap 的懒加载 code-split，改为 queryFn 内动态 `import()` 后警告消失。

真实应用浏览器视觉复核未执行（沿用 #19 的本地服务器授权限制）；核心融合、距离检索与门控降级均以自动化测试覆盖。

## 后续

#21 石墨语义星图可复用同一 Worker client 与本人向量做确定性 2D 投影 + 分层渲染，作为列表并列可切换的第二视图；建议先用 `/prototype` 收口降维算法与渲染分层再进入实现。#22 涌现簇 + promotion 仍依赖 #21。
