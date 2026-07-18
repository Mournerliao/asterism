# 0004 · Phase 0 脚手架的工程取舍

- Status: Accepted
- Date: 2026-06-29

> 2026-07-18：第 4 项“Biome 不处理 CSS”及其 Stylelint 备选已由 ADR 0019 废止。项目当前 Biome 2.5.1 可解析 Tailwind v4 指令，Phase 1 收尾将 CSS 纳入同一 lint/format 门禁，不引入 Stylelint。其余 Phase 0 工程取舍保持有效。

## Context（背景）

Phase 0 要把 `contracts/architecture.md` 的 monorepo 蓝图变成**最小可构建骨架**：
`apps/{web,extension,desktop}` 与 `packages/{core,ui,db,config}` 就位，`turbo`
跑通 lint / typecheck / test / build，并建立 CI。落地过程中有几处实现选择需要固化，
避免后续漂移。需要 Supabase 凭据的部分（项目、schema/RLS、GitHub OAuth）按计划留到
本地骨架完成后再做，不在本 ADR 范围内。

## Decision（决策）

1. **共享库用 `tsc` 构建，不引入打包器**
   - `core` / `db` 用 `tsc` 直接 emit 到 `dist`（声明 + sourcemap），符合
     `AGENTS.md` 的运行时基线（不新增构建工具）。应用端由 Vite / WXT 打包消费 `dist`。
   - 与既有 `turbo.json` 的 `typecheck`/`build` 依赖 `^build` 模型一致（编译型包）。

2. **`packages/ui` 用 `@/` 别名 + `tsc-alias`**
   - 保留 shadcn 习惯的 `@/*`（便于后续 `shadcn add`），构建为
     `tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json`，
     由 `tsc-alias` 把 `@/` 重写为相对路径，保证 `dist` 可被任意打包器消费。
   - TypeScript 6 已弃用 `baseUrl`（TS5101），故 `paths` 不配 `baseUrl`，以
     `"@/*": ["./src/*"]`（相对 tsconfig）方式声明。

3. **Tailwind v4 + shadcn（neutral）+ `tw-animate-css`**
   - `globals.css` 严格照搬 `contracts/ui-ux.md` 的 neutral oklch token；`@theme inline`
     映射与 `@layer base` 采用 shadcn v4 标准脚手架；动画用 `tw-animate-css`
     （v4 取代旧 `tailwindcss-animate`）。
   - 跨包内容检测：`globals.css` 内用 `@source '../components'` 让消费端 Tailwind
     扫描到 `ui` 组件里的类名（已验证 web/extension 产物含 Button 样式）。

4. **Biome 不处理 CSS**
   - Biome 的 CSS 解析器无法识别 Tailwind v4 的 `@theme` / `@apply` 等语法，故在
     `biome.json` 用 `files.includes: ["**", "!**/*.css"]` 将 `*.css` 排除在
     lint/format 之外。TS/JS/JSON 仍由 Biome 统一约束。

5. **`apps/desktop` 仅占位，Tauri 2 推迟到 Phase 4**
   - Phase 0 不引入 Rust 工具链，`desktop` 仅保留包骨架与占位 `build`，使 CI 保持纯
     Node、快速。真正的 Tauri 套壳（复用 `apps/web`）在 Phase 4 落地。

6. **`apps/web` 为最小壳，特性库延后到 Phase 1**
   - 仅接 React + React Router + 最小 react-i18next（en/zh-CN，满足"文案不硬编码"），
     并 `import @asterism/{ui,core,db}` 证明依赖图打通；TanStack Query/Virtual、
     Zustand、Dexie 实接等在 Phase 1 按需引入，避免未用依赖。

7. **CI（GitHub Actions）**
   - 单 job：`pnpm/action-setup` + Node 22（读 `.nvmrc`）+ pnpm 缓存，
     `pnpm install --frozen-lockfile` 后依次 `lint` / `typecheck` / `test` / `build`。
     纯 Node，无 Rust。

## Consequences（影响）

正面：

- 骨架最小、构建快、CI 轻；shadcn 的 `@/` DX 保留，库产物可被任意打包器消费。
- 设计 token 单一来源于 `ui-ux.md`，未自造风格；跨包样式检测已验证可用。

负面 / 需注意：

- 引入 `tsc-alias` 作为 `tsc` 的后处理（非打包器）；若未来组件增多或需更复杂构建，
  可重新评估是否切换到打包器（需另开 ADR）。
- Biome 暂不约束 CSS；如需 CSS 规范可后续引入 stylelint 或等 Biome 改进 Tailwind 支持
  （届时再决策）。
- `desktop` 当前不产出构建物（`turbo` 会提示无 outputs），属预期占位状态。

## Alternatives considered（备选方案）

1. **源码型包（不构建，导出 `src` 由应用端编译）**：免去 `tsc`/`tsc-alias`，但与现有
   `turbo` 的 `^build` 模型不一致，且 Vite 对 node_modules 内 TS 源的处理有边界情况，
   稳健性不如编译型包。
2. **用打包器（tsup 等）构建库**：能一步处理别名与多格式输出，但属新增构建工具，超出
   `AGENTS.md` 基线，Phase 0 不必要。
3. **Phase 0 即上完整 Tauri 2**：需要 Rust 工具链，显著拖慢本地与 CI，与"最小可构建
   骨架"目标相悖，故推迟到 Phase 4。
