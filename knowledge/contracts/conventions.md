# Conventions Contract · 规范契约

> 本文件定义编码、目录边界、提交、i18n、发布工程、包管理与安全规范。它是工程层 verification 的依据：代码评审与 CI 都应以此裁定合规与否。规范变更须同步更新本文件并记录 ADR。

## Coding · 编码规范

- **TypeScript strict**：`tsconfig.base.json` 开启严格模式；禁止隐式 `any`，避免无谓的类型断言。
- **Biome 统一 lint + format**：以 Biome 同时承担格式化与静态检查，单一工具、单一配置，避免 ESLint/Prettier 双栈冲突。提交前由 lefthook 的 `pre-commit` 自动跑 Biome。
- **不写叙述性注释**：禁止"// 导入模块""// 自增计数器"这类复述代码的注释。注释只用于解释非显而易见的意图、取舍或约束；不要用注释解释你做了什么改动。
- **kebab-case 文件名**：源文件名在适用处使用 kebab-case（如 `sync-stars.ts`、`repo-card.tsx`）。React 组件用 PascalCase 命名，但文件名仍用 kebab-case。

## Directory Boundaries · 目录职责边界

跨包依赖必须单向、清晰，禁止把平台专有 API 渗入共享包。

- **业务逻辑 → `packages/core`**：GitHub API、同步、领域模型等都在 core，与 UI / 平台无关。
- **UI → `packages/ui`**：所有可复用组件、设计系统在 ui；遵循 `ui-ux.md` 设计契约。
- **数据访问 → 仅经 `packages/db`**：Supabase 客户端、查询、Dexie 缓存是数据访问的**唯一入口**；其他包不得直接拼 SQL 或直连 Supabase。
- **共享包不含平台专有 API**：`core` / `ui` / `db` 不得引用 `chrome.*`、Tauri、Node 专有或浏览器扩展专有 API；平台差异留在 `apps/*` 内适配。

## Commit Convention · 提交规范

- **Conventional Commits**：用 commitlint + `@commitlint/config-conventional` 校验。
- **subject 英文、body 中文**：subject 形如 `type(scope): 英文摘要`（如 `feat(core): add incremental star sync`），正文 body 用中文详述背景与取舍。
- **git 钩子由 lefthook 管理**：`commit-msg` 跑 commitlint，`pre-commit` 跑 Biome；**第一次提交即生效**（见 `../decisions/0003-commitlint-lefthook.md`）。
- **绝不绕过钩子**：禁止使用 `--no-verify` / `--no-gpg-sign` 等方式跳过校验。

## i18n · 国际化

- **全部用户可见文案外部化**：禁止在组件中硬编码用户可见字符串，一律走翻译资源。
- **默认 en + 内置 zh-CN**：用 react-i18next（跨 web / 扩展通用、最稳），默认英文，内置简体中文。
- **新增文案同步两种语言**：新增任何 key 必须同时提供 en 与 zh-CN 文案。

## Release Engineering · 发布工程

- **Changesets**：用 Changesets 管理版本与 changelog。
- **包 scope `@asterism/*`**：所有包统一命名空间。
- **共享包私有 workspace（不发布）**：`core` / `ui` / `db` / `config` 等为私有 workspace 包（`"private": true`），暂不发布到 npm；Changesets 仅用于内部版本与 changelog 管理。

## Package Manager · 包管理

- **pnpm**：以 pnpm 作为唯一包管理器，`packageManager` 字段锁定版本；配合 Turborepo。
- **选型理由**：见 `../decisions/0002-pnpm-over-bun.md`。
- **已知 footgun（记录备查）**：曾评估 Bun。Bun workspaces 与 Vite 配合时存在**传递性 CJS 依赖提升（transitive CJS hoisting）**的坑——某些只被间接依赖的 CJS 包未被正确提升 / 预构建，导致 Vite dev 阶段报模块解析或 `does not provide an export` 类错误，叠加 Turborepo 对 lockfile 版本较敏感，整体不够稳妥。**缓解办法（若未来重新考虑 Bun 时备用）**：在 Vite 配置中用 `optimizeDeps.include` 显式声明这些传递性 CJS 依赖，强制预构建。当前选 pnpm 即为规避此类不确定性。

## Security · 安全

- **绝不提交任何密钥**：禁止把 token / API key / service role 等写入仓库或日志。
- **`.env` 不入库**：环境变量经 `.env` 本地配置，`.gitignore` 忽略；仓库只提供 `.env.example` 占位（无真实值）。
- **BYOK key 加密存储**：用户自带的 AI key 必须加密后存于 `user_settings`，绝不明文落库（见 `data-model.md`）。
- **同步更新知识库**：任何代码 / 配置 / 架构变更，都必须同步更新 `knowledge/`（契约、状态、必要时 ADR），保持单一事实源不漂移。
