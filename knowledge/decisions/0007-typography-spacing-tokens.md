# ADR 0007：字体与间距 token 定稿

## 状态

已接受 · 2026-07-02

## 背景

Phase 1 功能验收后，UI 与 Ardot 设计稿在字体、字号、间距上存在系统性偏差。`ui-ux.md` 中 Typography / Spacing 仍为 TBD，实现层依赖 shadcn 默认 Tailwind 类。

## 决策

1. **字体**：全站使用 **Geist Variable**（正文）+ **Geist Mono Variable**（数字/日期），经 `@fontsource-variable/*` 自托管，在 `packages/ui/globals.css` 引入。
2. **字号**：从 Ardot 11 个 frame 实测提取 8 档语义 token（display / page-title / section-title / drawer-title / repo-name / body / caption / micro），映射到 CSS 变量与 Tailwind `@theme inline`。
3. **间距**：4px 栅格（`--spacing-unit: 0.25rem`），页面 padding 按 frame 区分 24px（Browse）与 32px（Tags/Collections/Settings）。
4. **Inter**：设计稿部分后期 frame 标注 Inter，全站统一 Geist 以保持一致性（Inter 作系统 fallback）。

## 后果

- 像素级还原有明确契约依据；后续 UI 修改须引用 token，禁止魔法值。
- `packages/ui` 新增 `@fontsource-variable/geist` 依赖，构建体积略增。
