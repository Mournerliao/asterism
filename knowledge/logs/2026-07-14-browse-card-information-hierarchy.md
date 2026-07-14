# Browse Card Information Hierarchy · 2026-07-14

## 目标

压缩 Browse 卡片的无效空白和不稳定换行，把用户自己的标签、集合与笔记状态提升到 GitHub topics 之上，同时保持千级 Star 的虚拟滚动与三列扫描效率。

## 实现

- Repo Card 调整为身份、描述、整理上下文、单基线 Footer 四段式；桌面 / 平板高度 208px，窄屏允许安全增高。
- 用户标签与 topics 合并到单行宽度测量器：标签优先、大小写不敏感去重、剩余项通过 `+n` tooltip 展示。
- Browse 并行读取 collection↔repo 关联与轻量 note repo ID 索引，通过 `Map` / `Set` 一次聚合后传入卡片，无 N+1 查询。
- 集合 / 笔记状态移入整理信息栏；Footer 左侧保留 Stars / Forks，右侧使用不可换行的紧凑 Updated / Starred 时间组，完整时间保留在 tooltip 与无障碍标签中。
- 两行描述通过实际 `scrollHeight` / `clientHeight` 与宽度差异判断是否截断；仅溢出时启用完整描述 tooltip，并通过 `ResizeObserver` 响应卡片宽度变化。
- 整卡详情按钮与 GitHub 外链改为并列交互；集合 / 笔记状态可通过键盘聚焦并打开详情。
- Loading skeleton、虚拟化估算、Light / Dark token 使用以及 en / zh-CN 文案同步对齐。

## 验证

- Impeccable detector：目标文件 0 findings。
- Web / DB typecheck：通过。
- Web tests：20 项通过，覆盖标签优先级、去重、长内容、集合计数、笔记状态增删、紧凑相对时间与描述溢出判定。
- Biome lint、全仓 test、production build：通过。
- 首轮 184px 方案经用户提供的真实三列截图复核，确认垂直呼吸感不足且双行 Footer 产生 Z 字扫描折返；据此二次收敛为 208px、12px 主节奏与单基线 Footer。Light / Dark 与窄屏交互仍需在可用浏览器会话中补看。

## 决策

本次仅改变现有 UI 信息层级与内部查询接口，不修改数据库 schema、领域模型或架构边界，因此无需新增 ADR。
