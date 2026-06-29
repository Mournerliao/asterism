# Runbook · 自托管 / 本地起步

> **状态：STARTER / 占位（待 Phase 0 展开）。** 当前 Asterism 尚无业务代码，本文档先固化两条部署路径与所需环境变量的骨架，待脚手架与 Supabase schema 落地后再补全可执行步骤。
> 凡标注 `TODO` 处均为 Phase 0+ 待补的实际命令/配置。

## 两条部署路径

### 路径 A：维护者（公共实例）

面向想直接体验、无需自己跑后端的用户。

- 后端：**Supabase 免费实例**（Auth + Postgres + pgvector + Edge Functions + Realtime）。
- 前端：**静态托管 Web**（Vercel / Netlify / Cloudflare Pages 之一）。
- 提供一个**公共体验地址**（占位 `asterism.dev`，最终域名待定）。

> 该路径由项目维护者运维；普通用户访问公共地址即可，无需配置环境变量。

`TODO（Phase 0）`：

- [ ] 确认公共实例域名（替换占位 `asterism.dev`）
- [ ] 记录 Supabase 项目创建与 schema/RLS 初始化步骤（对齐 `contracts/data-model.md`）
- [ ] 记录静态托管的构建命令与产物目录
- [ ] 记录公共 GitHub OAuth App 的回调 URL 配置

### 路径 B：自部署者（自有实例）

面向想完全掌控数据、在自己环境运行的用户。

1. **用 `docker-compose` 跑 Supabase**（自托管 Supabase 栈：Postgres / Auth / Realtime / Edge Functions 等）。
2. **环境变量指向自有实例**（见下方环境变量清单）。
3. **自注册 GitHub OAuth App**：在 GitHub 创建 OAuth App，拿到 client id / secret，并把**回调 URL** 填成自有 Supabase Auth 的 callback 地址。

`TODO（Phase 0）`：

- [ ] 提供 `docker-compose.yml`（或引用官方 Supabase self-host compose）与最小配置说明
- [ ] 提供数据库迁移/初始化命令（schema + RLS + pgvector 扩展）
- [ ] 写明 GitHub OAuth App 注册步骤与回调 URL 格式
- [ ] 写明前端如何指向自有后端（构建期/运行期环境变量注入）
- [ ] 说明 BYOK 密钥加密存储所需配置（Phase 3）

## 所需环境变量（占位 / 待定稿）

> 以下为骨架占位，变量名以最终代码实现为准；**切勿把真实密钥提交进仓库**，使用 `.env`（已被 `.gitignore` 忽略）。

```bash
# Supabase —— 前端与服务端访问后端所需
SUPABASE_URL=            # 自有/公共 Supabase 实例 URL，例如 https://xxxx.supabase.co 或自托管地址
SUPABASE_ANON_KEY=       # Supabase anon public key（前端使用）
# SUPABASE_SERVICE_ROLE_KEY=   # 仅服务端/Edge Functions，切勿暴露给前端  TODO 确认是否需要

# GitHub OAuth App —— 用于 GitHub 登录
GITHUB_OAUTH_CLIENT_ID=      # GitHub OAuth App 的 Client ID
GITHUB_OAUTH_CLIENT_SECRET=  # GitHub OAuth App 的 Client Secret（服务端保密）
# 回调 URL（在 GitHub OAuth App 中配置，非环境变量）：
#   指向 Supabase Auth 的 callback，例如 {SUPABASE_URL}/auth/v1/callback   TODO 确认实际路径
```

`TODO（Phase 0）`：

- [ ] 与实际代码对齐最终变量名（含前端构建期 vs 运行期注入方式）
- [ ] 补充 Phase 3 BYOK 相关变量（用户自带 AI key 的加密存储所需配置）
- [ ] 提供 `.env.example` 模板文件

## 相关参考

- 架构与 OAuth/权限：`knowledge/contracts/architecture.md`
- 数据模型与 RLS：`knowledge/contracts/data-model.md`
- 决策（为何选 Supabase）：`knowledge/decisions/0001-supabase-baas.md`
- 路线图：`knowledge/roadmap.md`
