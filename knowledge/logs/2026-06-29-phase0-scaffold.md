# Loop 运行日志 · 2026-06-29 · Phase 0 脚手架

> 运行日志层（Logs）。本条记录 Phase 0「脚手架」的本地骨架部分（M1–M3），
> 需要 Supabase / GitHub OAuth 凭据的剩余里程碑留待凭据到位后另起一条。

- **日期**：2026-06-29
- **阶段**：Phase 0 · Scaffold（见 `roadmap.md`）
- **范围**：本地可构建骨架 + CI；**不含**需要凭据的 Supabase / OAuth 部分

## Goal（目标）

把 `contracts/architecture.md` 蓝图变成最小可构建骨架，使 `turbo` 的
lint / typecheck / test / build 全绿，并建立 CI。完成判据：

- `apps/{web,extension,desktop}` 与 `packages/{core,ui,db,config}` 实包就位。
- `packages/ui` 接 Tailwind v4 + shadcn（neutral 主题来自 `ui-ux.md`）。
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` 全部通过。
- GitHub Actions CI 配好（lint/typecheck/test/build）。

## Steps（已执行步骤）

1. **`packages/config`**：tsconfig 预设（`base` / `library` / `react-library` / `vite-app`），各包通过 `@asterism/config/tsconfig/*` 继承。
2. **`packages/core`**：领域类型占位（`Repo` 对齐 `data-model.md`）+ `repoFullName` + Vitest 用例；`tsc` 构建到 `dist`。
3. **`packages/db`**：`createSupabaseClient` 工厂（封装 `@supabase/supabase-js`，唯一数据访问入口）+ `AsterismCache`（Dexie 占位）+ 用例。
4. **`packages/ui`**：shadcn 结构（`components.json`、`cn`、`globals.css` 照搬 `ui-ux.md` neutral oklch token + `@theme inline` + `@layer base`，动画用 `tw-animate-css`）、`Button` 种子组件；`@/` 别名经 `tsc-alias` 重写后构建。
5. **`apps/web`**：Vite + React Router + 最小 react-i18next（en/zh-CN），`import @asterism/{ui,core,db}` 打通依赖图，读 `import.meta.env` 判断 Supabase 是否已配置。
6. **`apps/extension`**：WXT（MV3）+ `@wxt-dev/module-react` 最小 popup，复用 `@asterism/ui` 的 `Button` 与 `globals.css`。
7. **`apps/desktop`**：占位包（`build` 占位脚本 + README，Tauri 2 推迟 Phase 4）。
8. **根配置/依赖**：`pnpm add` 解析各包第三方依赖（真实版本，未臆造）；补装根 `turbo`；`.env.example` 落位；`biome.json` 排除 `*.css`。
9. **CI**：`.github/workflows/ci.yml`（`pnpm/action-setup` + Node 22 读 `.nvmrc` + 缓存，`--frozen-lockfile` 后跑 lint/typecheck/test/build）。

## Verification（验证）

- [x] `pnpm build`：6/6 任务通过（Vite 与 WXT 均产出，Tailwind 生成含 Button 的样式）。
- [x] `pnpm typecheck`：8/8 通过（含 WXT `wxt prepare` 后的扩展 typecheck）。
- [x] `pnpm test`：5/5 通过（core 1 + db 2 用例）。
- [x] `pnpm lint`：Biome 0 错误（`*.css` 已排除；导入/导出顺序经安全修复）。
- [x] 契约核对：目录边界（数据访问仅经 `db`）、kebab-case、文案外部化（web）、`@asterism/*` 私有包、无密钥入库。

## 关键修复（踩坑）

- **TS6 弃用 `baseUrl`（TS5101）**：`ui` 改为无 `baseUrl` 的 `paths`（`"@/*": ["./src/*"]`）。
- **WXT 生成的 tsconfig 不带 `jsx`**：`apps/extension/tsconfig.json` 覆盖 `jsx: react-jsx`。
- **Biome 无法解析 Tailwind v4 语法**：`biome.json` 用 `files.includes` 排除 `*.css`。
- **`turbo` 未安装**：根 `devDependencies` 补 `turbo`。

## Outcome（结果）

Phase 0 本地骨架完成：可构建的 monorepo（4 包 + 3 应用）、Tailwind v4 + shadcn 基底、四道工程门全绿、CI 就位。决策固化于 `decisions/0004-phase0-scaffold-choices.md`。

## Follow-ups（后续）

- **停在凭据 handoff**：向用户索取 Supabase `Project URL` / `anon key`，并在 Supabase 后台配置 GitHub OAuth provider。
- 拿到凭据后：`supabase/migrations` 初始 schema + RLS（对齐 `data-model.md`）、启用 `pgvector`、打通 OAuth 登录回流（Phase 0 剩余里程碑）。
- Phase 1 起按需引入 TanStack Query/Virtual、Zustand、Dexie 实接；扩展端 `_locales` i18n 留 Phase 2。
