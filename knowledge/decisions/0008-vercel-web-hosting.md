# 0008 · 采用 Vercel 托管 Web 生产环境

- Status: Accepted
- Date: 2026-07-08

## Context（背景）

`apps/web` 是一个 Vite + React + React Router 的纯静态 SPA（无 SSR、无服务端运行时），产物为 `apps/web/dist/` 下的 HTML/JS/CSS。`architecture.md` 把 Web 的静态托管列为 **Vercel / Netlify / Cloudflare Pages 三选一**，未强制某一平台。

本次需要把 Web 部署到**生产环境**对外提供服务。约束与价值取向：

- 构建链是 pnpm workspace monorepo + Turborepo，`build` 必须先构建 `@asterism/{core,db,ui,config}` 再构建 `web`（`turbo run build --filter=@asterism/web`）。
- 前端是 SPA，需要把未匹配的深层路由回退到 `index.html`（否则 `/collections` 等 404）。
- 环境变量仅客户端 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`，由 Vercel 在构建期注入。
- 侧重开发体验与 Git 集成的自动部署，且团队已存在 Vercel 账号与 GitHub 仓库的集成。

## Decision（决策）

采用 **Vercel** 托管 `apps/web` 静态产物到**生产环境**：

- 项目落在团队 `xcm1115s-projects`，生产稳定域名为 `https://asterism-xcm1115s-projects.vercel.app`。
- 仓库根新增 `vercel.json` 固化构建与路由：
  - `framework: vite`
  - `installCommand: pnpm install`
  - `buildCommand: turbo run build --filter=@asterism/web`
  - `outputDirectory: apps/web/dist`
  - `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]`（SPA 回退）
- 将根 `package.json` 的 `prepare` 脚本改为 `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && lefthook install || exit 0`，避免在 Vercel 构建环境（无 `.git`）下 `pnpm install` 因 `lefthook install` 失败而中止构建。
- `.gitignore` 增补 `.vercel/`，不提交本地链接状态。

## Consequences（影响）

正面：

- Vercel 原生识别 Vite preset，自动处理静态托管与 SPA；`vercel.json` 把构建链与产物目录固化进仓库，可复现。
- 与 GitHub 仓库集成后支持 git push 自动部署（preview 分支出预览、main 出生产）。
- 部署命令与产物目录已沉淀进 `runbooks/self-host.md`，后续自托管/换平台时有据可查。

负面 / 需注意：

- **平台耦合**：生产前端绑定 Vercel；若要迁移到 Netlify / Cloudflare Pages，需对应改 `vercel.json`（rewrites 规则各平台语法不同）。`vercel.json` 已是仓库内唯一 Vercel 专属配置，迁移成本可控。
- **`prepare` 脚本改造**：本地有 `.git` 时仍正常安装 lefthook hook，仅在非 git 环境（CI/Vercel 构建）静默跳过，不影响本地开发规范。
- **Supabase 回调**：上线后必须把生产域名加入 Supabase Auth 的 Site URL / Redirect URLs，否则 GitHub OAuth 登录回调失败（前端可访问但无法登录）。

## Alternatives considered（备选方案）

1. **Netlify**
   - 优点：静态托管与 SPA rewrite 同样成熟，`netlify.toml` 可表达构建与重定向。
   - 缺点：团队现有 Vercel + GitHub 集成已就绪，切换需重新接 OAuth/部署，无额外收益。

2. **Cloudflare Pages**
   - 优点：边缘网络强、免费额度友好。
   - 缺点：monorepo + Turborepo 构建链需额外 `build-system` 配置；团队未在用，增加运维上下文。

3. **GitHub Pages**
   - 优点：与代码库同源、零额外账号。
   - 缺点：对 monorepo 多包构建、`/assets` 缓存与 SPA 回退（`404.html` hack）支持弱，且无法便捷注入 Vercel 式环境变量到构建期，不适合当前架构。

**为何选 Vercel**：团队已具备 Vercel 账号与 GitHub 仓库集成、Vite preset 开箱即用、且 `vercel.json` 能以最小专属配置固化 monorepo 构建与 SPA 路由，是当前最快达成"生产可用"的路径，符合 `architecture.md` 把 Vercel 列为候选之一的定位。
