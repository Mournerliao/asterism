# NOTES · 工作便签

> 持久状态层（Durable State）的"草稿纸"。模型没有跨会话记忆，本文件就是放在 **context 之外** 的便签：随手记下中途的发现、临时结论、易忘的指针，下次进来先扫一眼即可快速恢复状态。

## 如何使用本文件

- agent 在每轮 loop 中可随时往这里追加**短小的便签**：临时发现、待确认点、踩坑提醒、"为什么当时这么做"的备注。
- 与其他状态文件的分工：里程碑/阶段进度写 `PROGRESS.md`；正式待办与已知问题写 `BACKLOG.md`；重大且不可逆的决策写 `decisions/*` ADR；本文件只放**轻量、易变**的工作记忆。
- 过期或已沉淀进契约/ADR 的便签可以删除，保持本文件简短可读。

## 关键指针（决策与契约在哪）

- **决策（ADR）**：`knowledge/decisions/*` —— 一条决策一个文件，含背景/取舍/结论。
  - `0001-supabase-baas.md`：后端选 Supabase（Auth + Postgres + Edge Functions）；Realtime 部分由 ADR 0012 废止，pgvector 产品用途曾由 ADR 0022 移除、现由 ADR 0026 重新启用
  - `0012-remove-realtime-from-product-scope.md`：业务数据不做主动推送收敛，按查询边界读取 Postgres 最新状态
  - `0013-remove-dexie-offline-cache.md`：当前不承诺离线浏览；Postgres 是唯一持久化权威源，TanStack Query 只做会话内缓存
  - `0002-pnpm-over-bun.md`：工具链选 pnpm（而非 Bun）的取舍
  - `0003-commitlint-lefthook.md`：提交规范 + git 钩子方案
  - `0005-design-tokens-github-primer.md`：历史 Primer 配色（已被 ADR 0009 supersede；8px 圆角仍保留）
  - `0009-graphite-glass-visual-system.md`：当前石墨磨砂配色、玻璃边界与动效规则
  - `0018-typed-ai-provider-registry.md`：类型化 Generation Provider Registry，不把 Phase 2 做成完整 AI Gateway
  - `0024-custom-endpoint-ssrf-boundary.md`：自定义 endpoint SSRF 分类器守卫恒开 + 部署者域名 allowlist；HTTPS DNS-rebinding TOCTOU 为已知残余
  - `0022-remove-embedding-and-semantic-search.md`：移除 Embedding、pgvector 语义搜索与相关设置（**已被 ADR 0026 取代 / Superseded**，2026-07-23：0026 在其缝隙上以「多语言小模型 + 非 BYOK + 浏览器内 + 同源自托管」重新立项并 Accepted；0022 保留为历史背景）
  - `0026-ai-organization-flow-and-cluster-paradigm.md`：**检索优先范式（Accepted，2026-07-23）** —— 双平面（canonical 神圣 / derived 可弃 / promotion 唯一写入桥）+ 纯浏览器内 embedding（默认 `multilingual-e5-small`）+ 向量按用户存（`user_repo_embeddings`）+ 隐形混合搜索与石墨语义星图 + 涌现簇（安静的镜子）。Supersedes 0022 / Reframes 0020；#18 数据地基与 #19 浏览器 q8 运行时 / 增量回填已落地，待实现 #20 混合搜索、#21 星图与 #22 聚类 / promotion。
  - `0019-biome-tailwind-v4-css.md`：Biome 2.5.1 统一检查 Tailwind v4 CSS，不引入 Stylelint
- **契约（什么是"对/完成"）**：`knowledge/contracts/*` —— `product` / `architecture` / `data-model` / `conventions` / `ui-ux`。
- **设计源（Design Source）**：`contracts/ui-ux.md` + ADR 0009 是当前视觉与 token 权威；Ardot 文件 `698428420561751` 仅保留为历史布局/间距参考。
- **路线图**：`knowledge/roadmap.md`（Phase 0–4）。
- **进度**：`knowledge/state/PROGRESS.md`；**待办**：`knowledge/state/BACKLOG.md`。
- **入口约定**：根 `AGENTS.md`（声明 `knowledge/` 为单一事实源）。

## 技术栈一句话

开源、可自部署的多端 GitHub Star 管理器：**TypeScript + React + Tailwind/shadcn-ui** 前端，**Supabase**（Auth/Postgres/Edge Functions）后端，TanStack Query 提供会话内请求缓存，**pnpm + Turborepo + Vite + Vitest + Biome** 为工具链；阶段顺序 Web → AI（BYOK）+ 批量整理 → 扩展 → 桌面（共享 `core`/`ui`/`db`）。

## Phase 0 脚手架便签

- **本地骨架已就位**：`pnpm install` 后，`pnpm dev`（turbo）可起各端；`apps/web` 用 `pnpm --filter @asterism/web dev`，其 `predev` 会先构建 workspace 依赖，避免被忽略的共享包 `dist` 过期。四道门：`pnpm lint` / `typecheck` / `test` / `build`。
- **依赖版本**：由 `pnpm add` 在 2026-06 解析（如 TS 6、Vite 8、Vitest 4、React 19、WXT 0.20.x），以 `pnpm-lock.yaml` 为准，未手写臆造版本。
- **恢复点**：下一步是凭据 handoff（Supabase + GitHub OAuth），见 `PROGRESS.md` 与 `logs/2026-06-29-phase0-scaffold.md`。

## 待办提醒（便签级）

- **浏览器 embedding 资产与实测（2026-07-24，#19）**：固定 `Xenova/multilingual-e5-small@761b726…` 的 q8 ONNX（118,308,185 bytes，SHA-256 `f80102d3…c193`），`@huggingface/transformers` 4.2.0；构建脚本写入忽略目录 `.cache/embedding-assets/v1/public`，运行期只从 `/models/` 与 `/embedding-runtime/` 同源读取，禁止远程模型。批量大小固定 16；真实 Chromium 暖缓存 WebGPU 16 条 454ms、WASM 236ms，本机虽 WASM 更快仍按契约 WebGPU 优先并可靠回退。资产来源与复现见 `apps/web/EMBEDDING_ASSETS.md`。
- **构建期取模型可走代理 / 镜像 / 可离线降级（2026-07-24）**：`prepare-embedding-assets.mjs` 是 `pnpm build`/`predev` 的前置步；Node 构建期 `fetch` **直连 `huggingface.co`、不读系统/OS/浏览器代理**（让内置 fetch 读代理的 `NODE_USE_ENV_PROXY` 要 Node 24+，本项目 Node 22；`undici` 的 `EnvHttpProxyAgent` 又因该包在 `apps/web` 解析不到而不可用），故即使浏览器能开 HF 也可能 `UND_ERR_CONNECT_TIMEOUT`（10s 连接超时，国内/受限网络典型）。三条降级路：①**代理** `HTTPS_PROXY`（及 `http_proxy`/`ALL_PROXY` 等常规变量）——脚本自读并用 Node 内置 `http` 的 `CONNECT` 隧道 + `tls` 转发下载（零新增依赖），如 `http://127.0.0.1:7890`；②**镜像** `HF_ENDPOINT` 或 `ASTERISM_MODEL_BASE`（如 `https://hf-mirror.com` 拉**真实资产**；脚本里 `ASTERISM_MODEL_BASE` 优先级高于 `HF_ENDPOINT`）；③**跳过** `ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS=1`（拿不到就打警告继续、产物运行时回退关键词搜索）。下载失败重试 3 次；SHA-256 失配仍硬失败（损坏而非缺网）。turbo.json 声明分工：改变产物的 `HF_ENDPOINT`/`ASTERISM_MODEL_BASE`/`ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS` 进 `build.env`（入缓存键），只改路由不改字节的代理变量进 `build.passThroughEnv`。详见 `apps/web/EMBEDDING_ASSETS.md`。
- **当前设计系统**（2026-07-10）：配色已从 Primer 改为 Graphite Glass（ADR 0009）；8px 圆角、Geist 字体与 4px 间距栅格不变。玻璃只用于交互层，背景无噪点，Logo 为单色电光蓝。
- **工作区根目录未迁移**：本次初始化**未执行 `move_agent_to_root`**，当前会话仍以原工作区根为准，仓库位于 `/Users/asherliao/Projects/asterism`。后续若需以该仓库为工作区根，再单独切换。
- **Edge Function 部署是「每环境手工一次」**（2026-06-30）：`sync-stars` 之前没部署导致 Sync 报 404，已 `supabase functions deploy sync-stars`（项目 `hqtrmulypxwdqvzlkhke`，现 `ACTIVE v1`）。换项目 / 新部署者必须重跑该命令，否则同步必报错。`supabase functions list/deploy --project-ref` 会生成 `supabase/.temp/`（已 gitignore）。`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 由平台自动注入，无需手配 secret。
- **README Edge Function 已部署并验收**（2026-07-18）：当前 Supabase 环境已具备 `read-repo-readme`；授权、公开 fallback、无 README、非成员、限流、ETag 304 与真实复杂 README 路径均已验收。换项目 / 新环境仍需逐环境部署，边界见函数 README 与 ADR 0011。
- **Impeccable v3.9.1 项目级安装**（2026-07-10）：Codex skill 位于 `.agents/skills/impeccable/`，设计检测 hook 位于 `.codex/hooks.json`；由官方 CLI 管理。`apps/web/PRODUCT.md` / `DESIGN.md` 是对齐层，`knowledge/contracts/*` 仍为权威。
- **自定义 endpoint SSRF 已两层验证**（2026-07-20，ADR 0024）：托管 Supabase Edge Runtime 实测 `Deno.resolveDns` 可用、云 metadata 被平台挡，但 loopback / 私网出站会真实发起 → 必须自带分类器守卫。一次性探针函数已部署验证并删除（项目 `hqtrmulypxwdqvzlkhke` 现只剩 `sync-stars` / `read-repo-readme`）。本地原型（含分类器 `ssrf-guard.ts`）验证后已删除，答案固化进 ADR 0024，实现时按合同重建分类器。
- **`manage-ai-connections` 需逐环境部署且必配加密 secret**（2026-07-21，#13）：`supabase functions deploy manage-ai-connections` 之外，运行前必须 `supabase secrets set AI_CREDENTIAL_ENCRYPTION_KEYS=...`（base64 的 32 字节主密钥 JSON，缺失则 create/test 无法加解密），可选 `AI_CREDENTIAL_ACTIVE_VERSION` / `AI_CUSTOM_ENDPOINT_ALLOWLIST`（allowlist 留空则拒绝所有自定义 openai-compatible 端点）。换项目 / 新部署者两步都要重做，切勿提交任何密钥。轮换与 env 细节见函数 README。
- **Generation active pair 由数据库兜底**（2026-07-22，#13）：普通客户端只读 `user_settings`；写入经 `manage-ai-connections`，数据库 trigger 再强制 connection/model 同空同非空、connection 有效且 model 精确等于最近成功测试。连接失效、禁用或成功 model 变化时自动清除旧 active pair。端点/credential 变化必须清 capability；禁用状态下探活不得隐式启用。
- **`rotate-ai-connections` 是独立带外轮换函数**（2026-07-21，#13，US22）：与 `manage-ai-connections` 分离部署，用户请求不可达。部署走 `supabase functions deploy rotate-ai-connections --no-verify-jwt`（不经用户 JWT，仅由自有 secret 守卫），并须 `supabase secrets set AI_CREDENTIAL_ROTATION_SECRET=...`（经 `x-rotation-secret` header 触发，常量时间比较）。轮换把非 active 版本密文重加密到 active 版本；**退役旧密钥版本前必须先跑到「无残留旧版本行」**。curl 示例与流程见函数 README。
- **functions 已纳入根测试门禁**（2026-07-22）：`supabase/package.json` 的 `@asterism/supabase-functions` workspace 负责 typecheck/test；`pnpm test` 当前执行 10 files / 75 tests，无需再额外手工补跑。
- **AI 草稿确认需同时部署两个函数**（2026-07-23，#17）：`manage-ai-organization` 负责受信事务确认，Web 随后调用既有 `bulk-organize` 有界 executor；新环境必须应用 `20260723120000`、`20260723160000`、`20260723190000`、`20260723193000` 并部署这两个函数。Deno Edge Function 的本地相对导入必须显式写 `.ts`，否则 CLI bundling 会失败。当前项目 `hqtrmulypxwdqvzlkhke` 已部署并完成真实事务、幂等、RLS、名称复用 / 拒绝和执行恢复 smoke。
