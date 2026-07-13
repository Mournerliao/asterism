# 2026-07-13 · Graphite Glass 视觉系统重设计

## 目标

消除 Primer 主界面与独立 Lumno 玻璃控制条之间的配色割裂，建立 Asterism 自有的冷蓝石墨视觉系统：实体内容面稳定承载信息，磨砂玻璃只表达交互层，单一电光蓝承担品牌与操作语义。

## Impeccable 流程

1. 按官方方式执行项目级 Codex 安装，纳入 `.agents/skills/impeccable/` 与 `.codex/hooks.json`；官方运行时 ignore 规则写入 `.gitignore`。
2. 加载 `apps/web` 的 PRODUCT/DESIGN context，完整读取 shape、colorize、interaction、motion、responsive、accessibility、critique、audit 与 polish 参考。
3. Shape：确定“冷蓝石墨画布 + 实体内容面 + 限域交互玻璃”的层级，拒绝全页面玻璃、嵌套卡片、蓝紫装饰渐变和噪点背景。
4. Colorize：建立 Light/Dark 石墨色阶、单一电光蓝、语义状态色和蓝色阶图表；既有用户标签颜色不迁移，新标签使用克制色板。
5. Critique：经用户授权使用两个独立 sub-agent，设计评估与 detector/browser 证据相互隔离；归档首个 `apps-web-src` critique 快照，26/40、P0=0、P1=3。
6. Audit/Polish：修正 Dashboard hero metric 卡片模板、Collection Card 键盘激活、标签色板可访问名称、粗指针 44px 目标、全局 reduced-motion 与 Toast 玻璃层级。

## 实现范围

- `packages/ui/src/styles/globals.css`：替换 Light/Dark 核心 token，新增 `--glass-*` 分级表面、高光、阴影、warning/success/info、link/brand 与新版 chart tokens；删除页面噪点和品牌渐变工具类。
- `packages/ui`：保留 `GlassControlRow`、`GlassRailVariant`、`SegmentedControl` API；统一 Button/Input/Select/Textarea、Dialog/Sheet/Dropdown/Tooltip/Toast、Card/Tabs/Toggle 的材质、焦点和按压反馈。
- `apps/web`：Logo 改为单色节点与低透明连线；Sidebar 选中态、Topbar、GitHub 授权提示、Login、Browse 筛选与 Repo Card、Drawer、Dashboard、Tags/Collections 全部对齐 Graphite Glass。
- `packages/core`：新标签默认色板改为克制的蓝、绿、紫、橙、青、黄、粉与森林绿；既有标签数据保持不变。
- 文档：新增 ADR 0009，标记 ADR 0005 被取代，同步 `ui-ux.md`、`apps/web/DESIGN.md`、skills 治理、NOTES、BACKLOG 与 PROGRESS。

## 验证

- `pnpm lint`：通过，161 files，0 findings。
- `pnpm typecheck`：通过，8/8 tasks。
- `pnpm test`：通过，31 tests（core 24、db 2、web 7）。
- `pnpm build`：通过，6/6 tasks；保留既有 `use-session` 约 764 KB chunk 警告。
- `node scripts/sync-agent-skills.mjs --check`：通过；既有五个项目治理 skills 同步正常，Impeccable 由 installer-managed manifest 独立记录。
- Impeccable detector：`apps/web/src` 0 findings；`packages/ui/src` 0 findings。
- 对比度计算：Light/Dark 的主文字、次要文字、链接、Primary、Destructive、Success、Warning 核心组合均达到 WCAG 2.1 AA。
- 浏览器代表面：已检查 Light/Dark Browse、Dark Dashboard、390px Mobile Browse 与 Drawer；grid/list、主题、窄屏和浮层无横向溢出。最终 polish 后再次访问 localhost 被浏览器策略拒绝，未声称存在可见 overlay；代码审计、detector 与此前代表页面截图作为回退证据。

## 审查结论与后续

视觉系统已完成本次范围内的实现与 polish。Impeccable critique 认为主要剩余风险已转为产品行为而非配色：同步进度仍为推算值、Topbar Search 作用域大于真实作用域、写操作失败恢复不一致，以及 Browse 筛选层级偏平。以上均已写入 BACKLOG，避免在本次纯视觉重构中未经授权扩大状态模型、后端接口或 i18n 范围。

Questions skipped: findings were straightforward and in-scope fixes were applied; behavior-expanding issues were recorded in backlog.
