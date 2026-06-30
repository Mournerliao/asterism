# Loop 运行日志 · 2026-06-30 · globals.css 同步 Primer token

> 运行日志层（Logs）。把 `packages/ui` 的 `globals.css` 从 `0004` 注入的 shadcn neutral
> oklch 占位，同步为 `contracts/ui-ux.md` 已定稿的 GitHub Primer 配色 / 圆角 token（hex）。

- **日期**：2026-06-30
- **阶段**：UI 设计 token 落地（仅改 `packages/ui` 样式，不改业务逻辑）
- **范围**：`packages/ui/src/styles/globals.css` + `knowledge/` 状态与日志

## Goal（目标）

让代码侧 token 与契约一致，消除「契约已定稿但 `globals.css` 仍是 neutral 占位」的偏差。
完成判据（对齐 `BACKLOG.md` 跟进项与 `decisions/0005`）：

- `:root`（Primer light）/ `.dark`（设计稿实测 dark）两套 hex token 完整。
- 含 `--background/foreground/card/popover/primary/secondary/muted/accent/destructive/`
  `border/input/ring`、`--sidebar-*`、`--chart-1..5`、`--radius: 0.5rem`。
- 新增扩展 token `--link` / `--brand-from` / `--brand-to`（light/dark 两套）并在
  `@theme inline` 映射出来（否则 Tailwind v4 取不到）。
- `pnpm lint` / `typecheck` / `build` 全绿；light/dark 对比度达 WCAG 2.1 AA。

## Steps（已执行步骤）

1. **重写 `globals.css`**：`:root` / `.dark` 两套 token 全部替换为 `ui-ux.md` 的 Primer hex
   值；`--radius` 从 `0.625rem` 改为 `0.5rem`；补齐契约要求但旧脚手架缺失的
   `--destructive-foreground`（light/dark `#ffffff`）。
2. **扩展 token**：在两套下新增 `--link` / `--brand-from` / `--brand-to`（light
   `#0969da` / `#0969da→#8250df`；dark `#58a6ff` / `#58a6ff→#8c5cff`）。
3. **`@theme inline` 映射**：新增 `--color-link` / `--color-brand-from` / `--color-brand-to`
   与 `--color-destructive-foreground`，命名沿用 shadcn `--color-*` 脚手架风格；
   `@layer base` 与 `@custom-variant dark` 保持不变。
4. 未触碰字体 / 间距（仍为 TBD）。

## Verification（验证）

- [x] `pnpm lint`（Biome，exit 0）/ `pnpm typecheck`（exit 0）/ `pnpm build`（6/6 成功）全绿。
      Biome 不检 `*.css` 属预期（见 `decisions/0004` / `BACKLOG`）。
- [x] 编译产物 `apps/web/dist/assets/index-*.css` 含 Primer hex（`#1f883d`/`#238636`
      主色、`#0969da`/`#58a6ff` 链接蓝、`#0d1117` dark 画布），确认 Tailwind v4 取到值。
- [x] WCAG 2.1 AA 对比度（脚本计算，相对亮度法）：light/dark 两套的 fg/bg、card、
      primary-fg/primary、secondary、muted-fg、accent、destructive-fg/destructive、
      link/bg、sidebar 文字均 ≥ 4.5:1；焦点环 `--ring`/bg ≥ 3:1（light 5.19:1 / dark 7.49:1）。
      说明：`--border` 对画布约 1.5:1，属 Primer 官方装饰性分隔线（非 1.4.11 强制的控件边界），
      取自设计源，按契约为权威值。
- [x] Button 渲染链路：`bg-primary`/`text-primary-foreground`/`bg-destructive`/
      `bg-secondary`/`bg-accent`/`border`/`ring-ring` 全部映射到已定义 token，build 编入 CSS。
      当前 `apps/web` 尚无主题切换（属 Phase 1），故未起 dev server 截图；以 build +
      编译产物 + 对比度计算作为验收依据。

## Outcome（结果）

`globals.css` 与契约 Primer token 对齐，light/dark 两套完整且文字/交互对比度达 AA。
`BACKLOG.md`「`globals.css` 同步新 token」跟进项已勾销。

## Follow-ups（后续）

1. 字体 / 间距 tokens 待外部设计工具产出后回填 `ui-ux.md` 再同步 `globals.css`。
2. Phase 1 接入主题切换（system / light / dark）后，可对 Button 等组件做两套主题的可视回归。
