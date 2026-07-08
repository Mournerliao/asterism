# 2026-07-08 · Vercel 生产部署（apps/web）

## 目标

把 `apps/web`（Vite SPA）首次部署到 Vercel 生产环境，对外提供可访问地址。

## 执行过程

1. **前置准备**：用户在 Vercel 后台创建 Access Token（`VERCEL_TOKEN`，走环境变量，绝不作为参数传递）；从 Supabase 项目 `hqtrmulypxwdqvzlkhke` 取 Publishable key。
2. **新增 `vercel.json`**（仓库根）：
   ```json
   {
     "framework": "vite",
     "installCommand": "pnpm install",
     "buildCommand": "turbo run build --filter=@asterism/web",
     "outputDirectory": "apps/web/dist",
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
3. **`.gitignore`** 增补 `.vercel/`（不提交本地链接状态）。
4. **修正 `package.json` 的 `prepare`**：原 `lefthook install` 在 Vercel 构建环境（无 `.git`）下失败，导致 `pnpm install` 退出码 1、构建中止。改为 `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && lefthook install || exit 0`。
5. **链接项目**：`vercel link --repo` 命中已存在的 Vercel 项目（git remote `github.com/Mournerliao/asterism.git` 映射到团队 `xcm1115s-projects`）。
6. **环境变量**：`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 9 天前已配置且值与用户提供一致，无需覆盖。
7. **生产部署**：`vercel deploy --prod`。首次构建因 `prepare` 失败报 Error；修正后重部署，状态 `Ready`。

## 关键命令（token 走环境变量）

```bash
export VERCEL_TOKEN="vca_/vcp_..."            # 仅环境变量，禁止 --token 参数
vercel link --repo --scope xcm1115s-projects -y
vercel deploy --prod --scope xcm1115s-projects -y --no-wait
vercel inspect <url>                          # 查状态，不 curl 部署 URL
```

> 注：本机 Vercel CLI 全局安装有缺失依赖（luxon），直接用 `node <prefix>/node_modules/vercel/dist/index.js` 运行；`pnpm exec biome` 在本 Git Bash 环境因 `NODE_OPTIONS=--use-system-ca` 与 corepack 路径拼接异常无法运行，不影响部署。

## 结果

- 生产稳定域名：**https://asterism-xcm1115s-projects.vercel.app**
- 部署面板：`https://vercel.com/xcm1115s-projects/asterism`
- 构建状态：Ready；SPA rewrite 规则已生效（`/(.*) → /index.html`）。

## 后续待办（非本次范围）

- 将 `https://asterism-xcm1115s-projects.vercel.app` 加入 Supabase Auth 的 **Site URL / Redirect URLs**，否则 GitHub OAuth 登录回调失败。
- 可选：在 Vercel 绑定正式域名替换占位 `asterism.dev`（`vercel domains add`）。
- 后续可用 git push 触发自动部署（main → 生产，分支 → 预览）。
