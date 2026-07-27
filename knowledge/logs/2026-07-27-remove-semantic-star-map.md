# 2026-07-27 · 移除二维语义星图

## 目标

在全库涌现簇纠偏后，继续检查裸语义星图是否仍承担真实、独占的用户任务，并落实产品收敛决策。

## 结论

星图没有保留必要。裸点在点击前不表达内容，PCA 展示投影容易制造距离可靠的错觉，收藏变化还会导致坐标漂移。混合搜索与 Related Stars 已分别更直接地承担查找和继续探索；星图只剩视觉新鲜感，却持续增加第三视图、加载、维护与无障碍成本。

## 执行

- 新增 ADR 0028，取代 ADR 0026 §7 与 ADR 0027 §4 的正式星图决策。
- Browse 移除星图 toggle、页面投影计算、点亮路径与三视图分支。
- 删除生产 Canvas / React 星图组件、投影数据 hook、core PCA / 稳健归一化模块及测试。
- 删除 `/dev/star-map-prototype` 路由和整个一次性原型。
- Browse 视图偏好升级为 v1；`star-map` 与畸形旧值迁移至 grid，grid / list 保留。
- 删除 en / zh-CN 星图文案，更新产品、UI/UX、路线图与 durable state。

## 保留能力

- `user_repo_embeddings`、浏览器 embedding 运行时与新鲜度机制。
- 单一输入框的隐形混合搜索。
- Repo Quick Look 中允许为空的 Related Stars。
- Asterism 的星群品牌比喻。

## 验证

- `pnpm lint`：通过（316 files）。
- `pnpm typecheck`：通过（9 tasks）。
- `pnpm test`：通过（core 167、db 67、functions 94、web 179，共 507 tests）。
- `pnpm build`：通过；生产产物不再包含 star-map prototype chunk，仅保留既有主 chunk size warning。
- 真实登录页面（518 Stars）：Repository view mode 只包含 Grid view / List view，二者切换与 pressed 状态正常；恢复 Grid 后打开 `earendil-works/pi` Quick Look 正常，控制台无 error。
- 旧 `star-map`、未知值与畸形持久化状态由 6 个迁移单测锁定为 grid fallback。
