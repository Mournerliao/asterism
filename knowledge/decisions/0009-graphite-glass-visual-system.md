# 0009 · 采用 Graphite Glass 视觉系统

- Status: Accepted
- Date: 2026-07-10
- Supersedes: ADR 0005 的配色与品牌渐变；保留其 8px 圆角决策

## Context

Primer light、Lumno 冷灰玻璃与页面浅蓝噪点同时存在，导致侧栏、画布、卡片和控制区像来自不同产品。用户明确授权抛开既有配色，并选择「极简石墨 + 视觉全面升级」；随后确认保留磨砂控制和按钮按压反馈，但只扩展到交互层，背景保持纯净石墨。

## Decision

1. 采用 **Asterism Graphite Glass**：带品牌蓝色相的石墨中性色 + 单一电光蓝。Light 画布 / 面板为 `#F5F6F8 / #FCFCFD`，Dark 为 `#0B0E13 / #12161D`。
2. `#2563EB` 是唯一主操作色；链接、焦点和暗色 info 使用同色系的高可读变体。success、warning、destructive 不再复用 primary。
3. Logo 改为单色 `--brand`，节点实色、连线低透明；删除蓝紫渐变和 gradient text 能力。
4. 玻璃是交互材质：用于 Topbar、搜索/筛选/切换器与 portal 浮层。Repo Card、图表、Settings 内容块保持实体表面。背景不使用噪点、星尘、光晕或装饰渐变。
5. 保留 `GlassControlRow`、`GlassRail`、`SegmentedControl` 的 API、4px indicator inset 与 240ms 滑块动画；按钮/切换器增加 120–150ms 按压反馈，统一使用 ease-out，支持 reduced motion。
6. Dashboard 大面积图形使用蓝色阶；语言与标签色仅作为小面积信息编码。既有标签颜色不迁移，新建标签使用更新后的克制调色板。
7. 设计过程使用项目级 Impeccable 的 shape / colorize / critique / audit / polish 流程；Asterism contracts 始终优先。

## Consequences

- 明暗主题共享一致的语义层级，主操作、选中和链接不再与绿色 CTA 竞争。
- 玻璃材质获得明确边界，能保留识别度而不牺牲高密度内容的可读性和滚动性能。
- ADR 0005 的 Primer 色值与品牌渐变不再有效；Ardot 仅作为历史布局与间距参考。
- `--success` / `--warning` / `--info` / `--brand` 与玻璃表面 tokens 成为共享 UI 公共契约。

## Alternatives considered

1. **完全移除玻璃**：最克制，但会丢失用户明确喜欢的交互质感。
2. **大面积玻璃卡片**：主题感更强，但违反产品界面的信息优先原则，并增加 blur 性能与对比度风险。
3. **保留 Primer 绿 CTA**：改动小，但继续造成品牌蓝、状态绿和玻璃蓝灰之间的竞争。
