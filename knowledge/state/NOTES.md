# NOTES · 工作便签

> 持久状态层（Durable State）的"草稿纸"。模型没有跨会话记忆，本文件就是放在 **context 之外** 的便签：随手记下中途的发现、临时结论、易忘的指针，下次进来先扫一眼即可快速恢复状态。

## 如何使用本文件

- agent 在每轮 loop 中可随时往这里追加**短小的便签**：临时发现、待确认点、踩坑提醒、"为什么当时这么做"的备注。
- 与其他状态文件的分工：里程碑/阶段进度写 `PROGRESS.md`；正式待办与已知问题写 `BACKLOG.md`；重大且不可逆的决策写 `decisions/*` ADR；本文件只放**轻量、易变**的工作记忆。
- 过期或已沉淀进契约/ADR 的便签可以删除，保持本文件简短可读。

## 关键指针（决策与契约在哪）

- **#25 真实 smoke（2026-08-01）**：`manage-organization-tasks` 已部署至 Supabase project `hqtrmulypxwdqvzlkhke`，最终 Generation wire schema 为 `organization-generation-v3`（5 repo / page、紧凑 tuple、8,192 output tokens）。真实任务 `29b4c964-6aba-429c-aa4b-27707b499a37` 已到 `plan_ready`，Plan revision 1 / 242 actions / 1 conflict / 0 uncertainties；未 apply，canonical 未变化。reasoning model 可能把隐藏推理计入 completion budget，不能仅按可见 JSON 体积设置 output token。
- **Organization Task 部署（2026-07-28，#24）**：关联项目 `hqtrmulypxwdqvzlkhke` 已应用 `20260728180000_organization_tasks.sql` 与 `20260728183000_localized_organization_opportunity_goal.sql`，`manage-organization-tasks` 为 `ACTIVE v4`，更新后的 `sync-stars` 为 `ACTIVE v6`。新环境仍须按同一顺序迁移并部署两个函数。前者不需要 BYOK 加密 secret，不读取 credential，也不调用 Provider；缺少 active Generation Connection 时发现不会固化不完整披露。
- **Phase 2.1 tickets（2026-07-28）**：GitHub #23 已拆为 #24 → #25 → #26 → #27 → #28；#24、#25 已实现，当前 frontier 为被 #25 解锁的 #26。后续不得把一次性 prototype 演化为生产代码，也不得提前实现 #27–#28。
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
  - `0026-ai-organization-flow-and-cluster-paradigm.md`：**检索优先范式（Accepted，2026-07-23）** —— 双平面、纯浏览器内 embedding 与隐形混合搜索继续有效；§8 全库涌现簇 + promotion 已由 ADR 0027 取代，§7 的二维语义星图已由 ADR 0028 取代。
  - `0027-local-semantic-neighborhoods-over-global-clusters.md`：**局部语义邻域（Accepted，2026-07-27）** —— 真实 518 条个人 Star 否定稳定、互斥、可命名的全库分区；Quick Look 改为最多 5 条互为 Top-12 近邻的 Related Stars，旧向量过滤、允许为空、不显示相似度百分比。
  - `0028-remove-semantic-star-map.md`：**移除语义星图（Accepted，2026-07-27）** —— 二维裸点云没有混合搜索与局部邻域之外的独占用户任务，并增加探针式判断、投影误读、位置漂移、维护与无障碍成本；正式 Browse 只保留卡片 / 列表，Asterism 星群继续作为品牌比喻。
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

- **#25 真实 smoke 恢复点（2026-08-01）**：测试任务 `1b32d025-f397-4663-a972-68b219a4d396` 已停在 `generation_paused`；134 候选 / 3 页，0 页成功，3 次初始调用累计 27,266 tokens。不要直接 Resume 消耗剩余 3 次 retry；先修复 50 仓库页面与 4,096 output-token 上限导致的截断 JSON，并让 UI 显示安全 error code，再新建任务重跑。客户端 `generation` / `plan` checkpoint 契约遗漏已在工作区修复但尚未提交。

- **Phase 2.1 一次性原型（2026-07-28，verdict 已获得）**：运行 `pnpm prototype:natural-ai`；同一 Browse 路由通过 `?variant=A|B|C` 比较引导式工作区 / 规划对话 / 整理控制台，通过 `?scenario=first|incremental` 比较首次历史大库 / 后续新增 Star。用户选择 B，理由是“对话形式更自然”。原型仍仅为开发态内存 stub，无 Provider / canonical 写入；后续规格以对话为主骨架，但必须为复杂审阅、进度与恢复提供不依赖聊天滚动的稳定任务面。完整原型应保留到 throwaway branch 后再从 main 清理 losing variants，不要直接把 B 的原型代码当作生产规格。证据与未决项见 `logs/2026-07-28-natural-ai-organization-prototype.md`。
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
- **AI 草稿确认需同时部署两个函数（2026-07-23，#17）**：`manage-ai-organization` 负责受信事务确认，Web 随后调用既有 `bulk-organize` 有界 executor；新环境必须应用 `20260723120000`、`20260723160000`、`20260723190000`、`20260723193000` 并部署这两个函数。Deno Edge Function 的本地相对导入必须显式写 `.ts`，否则 CLI bundling 会失败。当前项目 `hqtrmulypxwdqvzlkhke` 已部署并完成真实事务、幂等、RLS、名称复用 / 拒绝和执行恢复 smoke。
- **#25 可恢复 Generation 已部署（2026-07-30）**：迁移 `20260730090000_organization_generation_runs.sql`（三张新表 + 8 个 RPC + 新任务状态 generating / generation_paused / needs_attention / plan_ready）已应用到关联项目 `hqtrmulypxwdqvzlkhke`（`supabase migration list` 已 Local=Remote），`manage-organization-tasks` 重新部署为 `ACTIVE v5`（run-page 等驱动动作添在同一函数）。项目级 secret `AI_CREDENTIAL_ENCRYPTION_KEYS` 已存在，故本函数 #25 新增的 Provider 调用路径可解密 BYOK；Generation 真实调用仍需存在 active Generation Connection。**仅部署，尚未做端到端 smoke test（未跑真实分页 loop / 归并 Plan）**。客户端驱动分页 loop 不能用 `active`/`cancel` 标志（会被 `runPending` 的 cleanup 清空导致 outcome 丢失、busy-spin），必须用 `useRef` 防重入 + 直接观测 outcome + `runPending` 翻转重新武装。
- **#21 星图 prototype 历史结论（2026-07-24，已于 2026-07-27 随 ADR 0028 删除）**：原型曾证明确定性 PCA 与 Canvas2D 分层渲染技术可行，但技术可行不等于产品必要。正式能力移除后，dev 原型与无调用方的投影模块一并删除；历史实验数据保留在 `logs/2026-07-24-issue21-star-map-prototype-spike.md`。
- **Related Stars 的可用性边界（2026-07-27）**：opt-in 只代表用户许可，不代表向量已可读。每次首次检查 / 增量回填都进入共享 `preparing`；成功失效 `embeddingKeys.list(userId)` 后才进入 `available`，失败进入 `degraded`，二者之外 Related Stars 必须静默。准备轮次用 token 仲裁，旧任务不得解锁较新的轮次。
