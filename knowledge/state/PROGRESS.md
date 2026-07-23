# PROGRESS · 项目进度与里程碑

> 持久状态层（Durable State）。本文件记录 Asterism 的**长期进度与里程碑**，是跨会话恢复"项目走到哪一步"的单一参考。
> 它不同于编排/会话记忆（那类属于 agent 临时 context），这里只沉淀对项目有长期意义的状态变化。
> 维护约定：每完成一个里程碑或阶段，更新本文件 + 在 `knowledge/logs/` 追加对应运行日志；细碎便签写 `NOTES.md`，待办写 `BACKLOG.md`。

## 当前状态

> **下一步（恢复点，2026-07-23）**：ADR 0026 检索优先范式已 **Accepted、设计完备但尚未落地**。真正的下一步是一个**尚未拍板的排期决策**——「先实现 0026 检索优先」还是「先推进 Phase 3 浏览器扩展」（下方 Phase 2 收尾写的「下一阶段为 Phase 3」早于 0026 Accept，仅历史参考，需重新确认排序）。**若走 0026**：第一颗 tracer bullet 建议为 `user_repo_embeddings` 迁移 + RLS（`data-model.md` 已定义 schema），再接客户端 Transformers.js embedding + 懒下载缓存；可用 `to-issues` 把 `BACKLOG.md` 的「检索优先实现」清单拆成可领取的纵向切片。**动手前先读** ADR 0026 与 `contracts/{product,ui-ux,data-model,architecture}.md`。

> **检索优先范式 Accepted（ADR 0026，2026-07-23）：三个开放问题已全部钻透，ADR 由 Proposed → Accepted，知识库契约已同步对齐；Accepted ≠ 已落地实现。** 把旧「批处理审批」AI 整理（选 ≤50 个 → 全量建议 → 逐项确认写入 canonical）重构为：① 核心价值检索优先；② 双平面（canonical 神圣 / derived 可弃 / promotion 唯一写入桥）；③ Embedding 为纯浏览器内平台能力（非 BYOK，默认 `multilingual-e5-small`，118M / 384 维 / MIT）；④ 向量按用户存于新表 `user_repo_embeddings`（与 `notes` 同构）、客户端直写、无受信写入路径 / 无投毒面；⑤ 检索交互 = 隐形混合搜索（零模式开关）+ 石墨语义星图（列表的并列可切换第二视图，非背景层）；⑥ 涌现簇 = 纯向量密度聚类（不混 topic / language），promotion 固化为快照写 `collections`、复用 0023 账本（`source: promotion`），性格为「安静的镜子」（系统不主动提示）。**Supersedes 0022（已改 Superseded）/ Reframes 0020。Accept 已同步改写 `product.md`（L25 / L78 / L128 + Advanced Features 注记）、`ui-ux.md`（L244）、`data-model.md`（新增 `user_repo_embeddings` 表 + RLS）、`roadmap.md`（L63）、`architecture.md`（L122 Provider 边界）；落地实现（迁移 / 客户端 embedding / 星图 / 聚类）仍待排期。** 无代码变更。见 `logs/2026-07-23-retrieval-first-paradigm-adr-0026.md`。

> GitHub Actions 的 Web 测试环境差异已修复（2026-07-23）：自 2026-07-16 起，CI 的干净检出不含本地 `.env`，而 `use-repo-readme.test.ts`（后续还有 `use-ai-organization.test.ts`）在收集阶段间接导入会立即校验 Supabase 配置的运行时单例，导致连续 15 次 run 在 Test 步骤失败；本地根 `.env` 一直掩盖该问题。Web Vitest 现在通过统一 setup 注入固定、非敏感的 `.invalid` URL 与占位 publishable key，使测试不依赖开发者环境或 GitHub Secrets，同时保留生产运行时缺配置即报错的边界。见 `logs/2026-07-23-ci-web-test-environment.md`。

> **阶段：Phase 2 AI（BYOK）+ 批量整理 — Done（2026-07-23）；下一阶段为 Phase 3 浏览器扩展。** Phase 2 合同中的可靠批量 tags / collections、选中仓库 JSON / CSV / Markdown 导出、类型化 Generation Provider Registry、加密 BYOK Connection 生命周期、master key 轮换，以及 AI 整理草稿的有界生成、持久化审阅、revision CAS、受信确认和中断恢复均已交付。维护者 Supabase 环境已验证 credential 生命周期、自定义 OpenAI-compatible capability、草稿 RLS / 事务 / 幂等 / 名称边界和实际批量执行；全仓 `pnpm lint / typecheck / test / build` 再次通过（434 tests，build 仅既有主 chunk warning）。本阶段不引入 Embedding、语义搜索、GitHub 写权限、正式 semver、Git tag 或首个公开版本流程。见 `logs/2026-07-23-phase2-closure-release.md`。

> Phase 2 AI 切片 B 已完成并在真实 Supabase 环境验收（2026-07-23，GitHub #17）：草稿确认现在携带 `draftId + expectedRevision + 完整 suggestions` 进入 service-role 数据库事务，先锁定并重新验证草稿、仓库与分类目标，再安全复用规范化等价分类、创建带确认快照和 `source_draft_id` 幂等键的 `source: "ai_draft"` 批量操作及逐关系 items，最后删除草稿；近似但非等价名称会保守拒绝并保留草稿。Web 最终确认层展示批准新分类、additions、removals 的准确计数，成功后立即驱动既有 50 条有界 executor，响应丢失或刷新后从 recovery banner 恢复同一操作。真实环境已验证事务消费、精确重放幂等、不同 payload 冲突、owner RLS、等价名称复用、近似名称拒绝、自动执行与清理；`manage-ai-organization` / `bulk-organize` 及 4 个 AI 草稿迁移均已部署。`pnpm lint / typecheck / test / build` 全绿（434 tests；build 仅既有主 chunk warning），Impeccable 检测无违规；无新增 ADR。见 `logs/2026-07-23-issue-17-ai-organization-confirmation.md`。

> Phase 2 AI 切片 B 的第二个纵向切片已实现并验证（2026-07-23，GitHub #16）：持久化草稿升级为 review schema v2，现有关系建议默认选中且可逐项取消 / 恢复，建议新分类默认未批准并单独审批，其仓库关系在审批前保持明确阻止。所有选择经受信 `manage-ai-organization` Edge Function 与 `packages/db` 边界持久化，每次 mutation 携带 expected revision，并由仅 service-role 可调用的数据库 RPC 做 compare-and-set；旧标签页得到稳定 conflict、保留较新决定并触发客户端重新读取。Browse 审阅按仓库分组，添加 / 移除 / 新分类不依赖颜色区分，支持键盘、语义状态、en / zh-CN、窄屏及 light / dark；有效空草稿仍可丢弃或替换。`pnpm lint / typecheck / test / build` 全绿（core 132 / db 53 / functions 87 / web 148；build 仅既有主 chunk warning），Impeccable 检测无违规；无新增 ADR。下一步为 #17「Confirm AI drafts through durable bulk organization」。见 `logs/2026-07-23-issue-16-ai-organization-review.md`。

> 根级开发服务器共享包预构建竞态已修复（2026-07-23）：`pnpm dev` 的 Turbo `dev` 任务现在先等待 workspace 依赖完成 `build`，避免 Vite 在 `packages/{core,ui,db}/dist` 仍为旧产物时启动并报新增命名导出不存在；共享包 watcher 随后继续承担增量编译。此次由 `@asterism/db` 源码已导出 `discardAiOrganizationDraft`、但旧 `dist/index.js` 尚未包含该导出触发。见 `logs/2026-07-23-root-dev-shared-package-prebuild.md`。

> Phase 2 AI 切片 B 的第一个纵向切片已实现并验证（2026-07-23，GitHub #15）：Browse 现在可对固定的 1–50 个仓库发起 AI 整理生成，在调用前披露准确 Provider、model 与发送字段；受信 `manage-ai-organization` Edge Function 从 Postgres 重建权威上下文，只在用户明确启用时读取并按每条 2,000 个 Unicode code points 截断笔记，永不读取 README。原生 Provider Adapter 经既有 SSRF / allowlist / 同源重定向边界调用并严格校验版本化建议 schema；生成成功后原子替换每用户唯一活动草稿，失败保留旧草稿。草稿可跨刷新恢复、只读查看 additions / removals / new classifications、识别有效空建议并显式丢弃。`pnpm lint / typecheck / test / build` 全绿（core 132 / db 52 / functions 83 / web 145；build 仅既有主 chunk warning），真实登录态视觉复核覆盖桌面 / 窄屏与 light / dark；无新增 ADR。下一步为 #16「Review and persist AI organization decisions」，#17 仍依赖 #16。见 `logs/2026-07-23-issue-15-ai-organization-drafts.md`。

> Phase 2 AI 切片 B 的剩余设计缺口已对齐并发布 PRD（2026-07-23，GitHub #14）：PRD 拆为 3 个串行纵向 issues——#15「Generate and resume bounded AI organization drafts」、#16「Review and persist AI organization decisions」、#17「Confirm AI drafts through durable bulk organization」；其中 #15 现已实现，#16 / #17 仍待完成。现有标签 / 集合建议引用稳定 ID，新分类使用带 `relationType` 的规范化名称；每用户最多一个活动草稿；单次最多 50 个仓库，每条已启用笔记最多发送前 2,000 个 Unicode code points；确认通过受信事务交接到 `source: "ai_draft"` 批量操作。见 `logs/2026-07-23-ai-organization-draft-alignment.md`。

> #13 已在真实 Supabase 环境完成部署与 smoke test（2026-07-22）：`20260721120000_ai_provider_connections.sql` 已应用，`manage-ai-connections` 与带外 `rotate-ai-connections` 已部署，服务端 encryption / rotation secrets 已配置；以 allowlist 内的 DeepSeek OpenAI-compatible endpoint 实测连接创建、模型发现/手填、capability 探活、激活、禁用/重新启用、credential 替换回到未测试及删除清理均正常。轮换函数仅完成部署，首次安装未触发轮换。#13 达到真实环境验收标准，可关闭。

> #13 暂存实现已完成全面复审与收敛（2026-07-22，见 `logs/2026-07-21-issue-13-byok-generation-connections.md` 的「全面复审与最终收敛」）：补齐 models 发现 + 手填 fallback、显式启用/禁用、最近测试详情、加载/失败恢复与笔记披露；受信服务拆出瘦入口 / HTTP handler / 生命周期 service。安全边界新增同源重定向限制，SSRF 分类补齐 IPv4-compatible IPv6 与保留网段；active connection/model 改为受信函数写入 + 数据库 trigger 纵深强制，连接失效或 capability 改变自动清引用。端点/credential 变化清除旧 capability，禁用连接探活不再隐式启用；密钥轮换例程与安全投影守卫保留。Impeccable 静态检测无违规；`pnpm lint / typecheck / test / build` 全绿（core 122 / db 49 / functions 75 / web 142，build 仅既有主 chunk warning）。无新增 ADR，契约与 runbook 已同步；实现提交为 `e908ddc`。

> #13 带外密钥轮换例程落地（2026-07-21，US22/Sp1，ADR 0017）：新增独立 Edge Function `supabase/functions/rotate-ai-connections`，与用户面 `manage-ai-connections` 分离、用户 handler 不可达。纯逻辑 `rotate.ts` 把非 active 版本的凭据密文用 active 版本重加密（AAD 重绑定 `version:userId:connectionId`），active 版本行跳过、单行失败隔离计入 `failed` 不中断整体；可测 `handler.ts` 用独立管理员密钥（`AI_CREDENTIAL_ROTATION_SECRET`，经 `x-rotation-secret` header + 常量时间比较）守卫，非 POST → 405、密钥缺失/不符 → 401、轮换抛错 → 500；瘦 `index.ts` 校验必需 env、缓存 key ring、以 service-role client 分页覆盖全部行。部署走 `--no-verify-jwt`（不经 Supabase 用户鉴权，仅由自有 secret 保护）。退役旧密钥版本前必须先跑到「无残留旧版本行」。函数 README + `supabase/README.md` runbook + `.env.example` 已同步。

> Phase 2 AI 切片 A（BYOK Generation Connections）已实现并验证（2026-07-21，GitHub #13，见 `logs/2026-07-21-issue-13-byok-generation-connections.md`）：新增 `ai_provider_connections` / `user_settings` 迁移与 RLS（客户端对连接表 `revoke all`，凭据生命周期只经受信函数），`manage-ai-connections` Edge Function（注入依赖 handler + service-role 瘦入口；JWT 校验、操作限定 `auth.uid()`、`list` 只回不含密文/nonce 的安全投影；AES-256-GCM + AAD 绑定 + 版本化 master key 支持轮换；自定义端点保存与探测都过 SSRF 守卫），`packages/core` 类型化 Generation Provider Registry（内置 OpenAI / Gemini / Anthropic / OpenRouter + 自定义 OpenAI-compatible 原生瘦 Adapter）与纯 SSRF 分类器 + 部署者 allowlist（ADR 0024），`packages/db` `invokeAiConnections` wrapper + 类型守卫 + `user_settings` 读写，`apps/web` 以 `AiConnectionsManager` 替换 Settings「AI Features / Coming Soon」占位并接 TanStack Query hooks，en / zh-CN 新增 `settings.ai.*`（半角空格与安全插值规范）。加密 / 注册表 / SSRF 边界沿用 ADR 0017 / 0018 / 0024，无新增 ADR。四道门禁全绿：`pnpm lint`（264 files）、`pnpm typecheck`（9 包）、`pnpm build`（6 tasks，主 chunk warning 为既有观察项）、测试 core 98 / db 42 / functions 52（manage-ai-connections 29，经 `vitest run --root supabase/functions`）/ web 138。runbook（`supabase/README.md` + `.env.example`）已同步。AI 整理建议流程（`ai_organization_drafts` 生成 / 审阅 / 确认写入）为切片 B，依赖本切片。

> Phase 2 AI 切片 A（BYOK Generation Connections）已综合为 spec 并发布 GitHub #13（`ready-for-agent`，2026-07-21）：作为 Phase 2 AI 部分的第一个纵向切片，覆盖 `ai_provider_connections` / `user_settings` 迁移与 RLS、受信 `manage-ai-connections` Edge Function（AES-256-GCM AEAD + 版本化 master key + 独立 secret + 轮换例程）、`packages/core` 类型化 Generation Provider Registry（OpenAI / Gemini / Anthropic / OpenRouter + 自定义 OpenAI-compatible，采用原生瘦 Adapter 而非 Vercel AI SDK 以便掌控 SSRF fetch）、纯 SSRF IP 分类器与部署者域名 allowlist（ADR 0024）、capability 测试、`invokeAiConnections` 与 Settings 连接管理 UI（实现走 `/impeccable`）。批量整理底座（#11/#12）已先行落地；AI 整理建议流程（`ai_organization_drafts` 生成 / 审阅 / 确认写入）为后续切片 B，依赖本切片。四道门禁与 en/zh-CN 为验收前提。

> 导出所选仓库已落地并收口 #11 / #12（2026-07-20，GitHub #12，见 `logs/2026-07-20-issue-12-export-selected-repositories.md`）：Browse 批量模式新增只读“导出所选仓库”，以固定 repository ID 范围下载 JSON 部分备份 / CSV 清单 / Markdown 可读归档，读取下载时最新数据、不改动任何用户数据、不创建写操作记录。核心裁剪逻辑落在 `@asterism/core` 纯函数 `scopeExportSnapshot`，Web 层以共享 builder（`buildExportSnapshot` / `buildSelectedExportSnapshot`）把 repoId 键数据映射并裁剪为 `fullName` 键快照，导入/导出页复用同一 builder；笔记正文按对话框打开门控拉取，失败保留选择并原地重试。可靠批量整理（#11）此前已于 2026-07-19 落地，本次一并关闭两个陈旧 OPEN issue。`pnpm lint / typecheck / test / build` 全绿（core 28 / db 18 / functions 23 / web 135），`/code-review` 双轴通过。

> 自定义 endpoint SSRF 边界已验证并裁决（2026-07-20，ADR 0024，见 `logs/2026-07-20-custom-endpoint-ssrf-verification.md`）：向目标 Supabase Edge Runtime 部署一次性探针实测后删除——`Deno.resolveDns` 可用（服务端可先解析再校验），云 metadata 已被平台挡，但 loopback / 私网出站会真实发起，平台不是充分兜底。裁决：分类器守卫（resolve 后校验 + 逐跳重定向重校验）恒开；因任一实例可能托管多租户，自定义 endpoint 在守卫之上叠加部署者域名 allowlist（内置 Provider 免配、个人实例可 allow-all、公开分享实例应 curate 或关闭）。HTTPS DNS-rebinding TOCTOU 为已知残余限制，allowlist 生效时规避。conventions「AI Provider 网络边界」与 BACKLOG 同步更新。

> Web 本地启动依赖预构建修复（2026-07-20，见 `logs/2026-07-20-web-dev-shared-package-prebuild.md`）：`pnpm --filter @asterism/web dev` 现在会先构建 Web 的 workspace 依赖，避免 `packages/{core,ui,db}/dist` 被忽略且过期时，Vite 从旧入口加载不到新增导出。此次由 `invokeBulkOperation` 源码已导出、但 `packages/db/dist/index.js` 仍停留在旧构建而触发；新增启动前置步骤后精确导出反馈环、DB 测试与 Web 构建均通过。

> 简体中文混排可读性规范化（2026-07-20，见 `logs/2026-07-20-zh-cn-mixed-text-spacing.md`）：明确汉字与拉丁术语 / 缩写 / 拉丁插值之间使用半角空格，统一中文界面的 `Star` / `GitHub Stars` 大小写，并把动态收藏时间改为自然的“收藏于 …”；语言名称全部外部化，切换 locale 时同步 HTML `lang`。新增全量 zh-CN 资源回归扫描，保护未来文案不再出现中英粘连；不改写仓库名、URL、代码与 README 原文，数字和中文量词继续遵循 locale 原生格式。`pnpm lint / typecheck / test / build` 全部通过（Web 130 tests）。

> 批量卡片点击语义修复（2026-07-20）：进入 Browse 批量选择模式时先关闭已有 Quick Look（未保存笔记继续走保护确认）；选择模式内仅项目名保留 GitHub 外链，描述及卡片其他区域统一切换选择，不再触发或残留 Quick Look。新增真实 `RepoCard` DOM 回归测试并先红后绿。

> 批量表格选中态降噪（2026-07-20）：Browse 列表在批量模式下改由 primary checkbox + 轻量整行 surface 表达选中，移除每个已选行重复的完整 inset ring，避免全选时形成高密度蓝色线条；Quick Look 的单行选中 ring、键盘焦点与 ARIA 语义保持不变。

> 设置页内容宽度统一（2026-07-20）：Settings 页面与对应路由加载骨架由独立的 `max-w-3xl` 收敛到常规页面共享的 `max-w-6xl` 内容宽度，消除跨页面切换时的左右边界不一致；保留设置表单原有密度、响应式折行和滚动边界。

> 批量选择交互优化（2026-07-19，见 `logs/2026-07-19-bulk-selection-ui-first-pass.md`）：Browse 批量模式改为明确的“模式 / 范围 / 动作”控制区；全选当前范围改为可逆的添加/取消，不再静默覆盖跨筛选选择；界面显示被筛选隐藏的已选数量；网格与列表共享整面选中反馈，选择模式内除卡片项目名 GitHub 外链外，其余内容统一为选择交互。en / zh-CN 与键盘/ARIA 语义同步，`pnpm lint / typecheck / test / build` 全部通过（Web 125 tests）。

> 表格选择框定位修复（2026-07-19）：虚拟化表格行补充 `relative` 定位上下文，避免绝对定位的选择框被表格 `overflow-clip` 裁掉；新增真实 `RepoTableRow` DOM 回归测试，先红后绿。

**阶段：Phase 1 Web MVP — Done（2026-07-18）；下一阶段为 Phase 2 AI（BYOK）+ 批量整理。** 用户可见主流程、真实 Supabase 核心链路、七项最终收尾与四道工程门禁均已验收。

> 真实环境验收确认（2026-07-18）：当前 Supabase 环境及所需 Edge Functions 已部署；GitHub OAuth 与会话恢复、首次/增量 Stars 同步、标签/集合/笔记持久化与 RLS 隔离、README authenticated / public fallback / no README / not in library / rate limit / ETag 304 路径均已完成验收。

> 跨平台质量门禁复核（2026-07-18）：`.gitattributes` 已固化 LF，工作区已规范化；`pnpm lint / typecheck / test / build` 全部通过，代码评审回归测试补齐后共 121 项。

> Phase 1 测试边界（2026-07-18）：Vitest 承担纯逻辑、数据映射、错误分支、Query hooks、组件、路由与 Edge Function handler 的单元/集成测试；OAuth、provider token、真实 RLS 与部署后函数由真实环境 smoke test 验收。当前不引入 E2E 工具或覆盖率数字。

> 构建体积裁决（2026-07-18）：生产构建成功，主 JS 约 815KB / gzip 241KB，并触发 Vite 默认 chunk warning。该 warning 不阻断 Phase 1，也不通过抬高阈值掩盖；后续仅在真实体验或成本指标支持时做拆包优化。

> Browse Search 作用域裁决（2026-07-18）：App Topbar 搜索只属于 Browse 路由，不是全局搜索或 command surface；Phase 1 收尾需隐藏其他路由上的搜索入口，消除写入 Browse store 后延迟显现的跨页副作用。

> 写失败恢复合同（2026-07-18）：标签、集合、笔记及其关联写入失败必须可见、可重试且不丢用户输入或错误地暗示成功；创建/重命名保留表单，笔记保留草稿与 Inspector，删除保留确认目标，关联恢复服务器状态。当前不采用 optimistic mutation，不引入通用 rollback 框架。

> Phase 1 部署边界（2026-07-18，ADR 0014）：阶段承诺是用户自有 Supabase Cloud + 静态托管的可自部署路径，必须有可执行 runbook；用户自行运行完整 Supabase 基础设施不属于 Phase 1，项目暂不维护 Docker Compose。

> 发布工程裁决（2026-07-18）：Phase 1 不要求正式 semver、Changelog 或 Git tag，生产部署以 Git commit / Vercel deployment 追溯；首个公开版本前再单独设计并验收 Changesets 发布流程。

> Migration 纪律（2026-07-18）：`supabase/migrations/*.sql` 是 schema、索引、触发器与 RLS policy 的唯一来源；禁止只在 Dashboard 手改线上，紧急修复必须补等价 migration。Phase 1 可继续手写维护 database types。

> 开源署名（2026-07-18）：MIT 版权署名统一为 GitHub 名 `Mournerliao`。

> 公共域名裁决（2026-07-18）：自定义品牌域名不阻断 Phase 1；维护者实例使用当前真实 Vercel 地址，不再展示未拥有的 `asterism.dev` 占位。未来绑定域名时同步 Supabase Auth redirect 配置。

> 隐私裁决（2026-07-18）：当前不采集匿名产品遥测；未来若有明确分析需求，必须重新定义采集范围、关闭机制、自部署行为与隐私说明。

> Biome CSS 复核（2026-07-18）：项目安装的 Biome 2.5.1 已原生支持 `css.parser.tailwindDirectives: true`；临时配置实测可解析当前 Tailwind v4 的 `@custom-variant`、`@source`、`@theme` 与 `@apply`，并发现 reduced-motion 中 4 处有意的 `!important` warning。Phase 1 将 CSS 纳入同一 lint/format 门禁，对必要规则做精确例外，不引入 Stylelint。

> Phase 1 最终收尾（2026-07-18）：LF + 四道门禁、Biome CSS、Dexie 清理、Browse Search 路由、写失败恢复、自部署 runbook 与登录页能力文案七项均已关闭，Phase 1 标记 Done。ADR 0022 移除未来向量能力；历史 initial migration 已启用但未被 Asterism 使用的 `vector` 扩展不自动删除，以免破坏自部署者同项目中的外部依赖。

> 路线顺序调整（2026-07-18，ADR 0015）：Phase 2 改为 AI（BYOK）+ 批量整理，Phase 3 再做浏览器扩展，Phase 4 桌面不变。批量整理只修改 Asterism 私有标签、集合与导出数据，不执行 GitHub star/unstar，也不申请 `public_repo` scope。

> AI 数据边界（2026-07-18，ADR 0022）：Phase 2 不建立 Embedding 或向量派生数据。Generation 分类固定读取仓库 owner/name、描述、语言、GitHub topics 与当前用户现有标签 / 集合；当前用户笔记只有在明确启用后才发送给所选 Provider，首次分类前展示字段与目标 Provider。README 与其他用户私有数据不发送。

> BYOK credential 边界（2026-07-18，ADR 0017）：类型化 Provider credential 只在保存请求和 Edge Function 当前调用内存中为明文，由独立服务端 master key 做 authenticated encryption；数据库保存 ciphertext、nonce、版本与可选非敏感提示，客户端无 credential 表直读权限。Phase 2 必须支持测试、启用/停用、替换、删除与 master key 轮换。

> AI Provider 边界（2026-07-18，ADR 0018、0022）：Phase 2 使用服务端类型化 Generation Provider Registry；首批内置 OpenAI、Google Gemini、Anthropic、OpenRouter，并提供受控的自定义 OpenAI-compatible Connection，DeepSeek 等兼容服务无需逐一内置。每个 Connection 一个 credential，不做 Embedding Provider、key 池、跨 Provider fallback、预算或限流，也不回退到 Asterism 付费额度。

> 搜索产品边界（2026-07-18，ADR 0022）：Embedding、pgvector 语义搜索、索引任务、相似推荐与自动聚类全部移出当前路线图；Browse 继续使用 Phase 1 已有的名称 / 描述关键词搜索。未来只有在出现明确价值且能提供无需理解底层模型的一键、多语言方案时重新立项。

> 代码评审修复（2026-07-18，见 `logs/2026-07-18-review-findings-fix.md`）：Topbar Search 的路由判断已从不存在的 `/browse` 修正为实际 Browse 根索引 `/`，并新增显示/隐藏回归测试；README 的 AI 文案同步移除语义搜索承诺，改为可审阅的整理建议与批量工作流。

> AI 整理写入边界（2026-07-18，ADR 0020）：Generation 只处理用户手动选择或“全选当前筛选结果”的仓库，调用前显示数量，不扫描整个库；可建议添加或移除标签 / 集合关系，但只生成可审阅的整理建议草稿，并优先复用用户现有分类。未确认草稿按用户持久化，刷新或离开后可继续；确认、丢弃或重新生成后清理。新分类经名称规范化与近似检查后作为独立建议，只有用户单独确认才创建。用户可逐项取消，明确确认后才通过批量整理写入。Phase 2 不允许模型无人值守地直接修改用户组织数据。

> Phase 2 查询持久化边界（2026-07-18）：批量整理只接受当前手动选择或当前筛选结果；本阶段不持久化命名筛选，也不保存关键词或语义查询历史。未来若有明确复用需求，再独立设计 Saved View。

> 批量整理可靠写入边界（2026-07-19，ADR 0023）：先实现不依赖 AI 的批量底座。“全选当前筛选结果”固化为 repository ID 范围；用户确认后持久化操作与逐关系项目，添加已有关系 / 移除不存在关系视为成功；成功项保留，失败项分为可重试与终止，刷新或中断后只继续待执行 / 可重试项。选中导出复用 JSON 部分备份、CSV 清单与 Markdown 可读归档，读取下载时的最新 Postgres 数据且不创建写操作记录。

> 批量整理 issues（2026-07-19）：已发布两个 `ready-for-agent` 纵向切片——GitHub #11「Add reliable bulk organization」与 #12「Export selected repositories」；#12 已通过 GitHub 原生依赖由 #11 阻塞。

> 可靠批量整理已落地（2026-07-19，GitHub #11）：Browse 的手动选择与“全选当前筛选结果”按 repository ID 固化，确认层可同时配置已有 tags / collections 的添加与移除。新增 `bulk_operations` / `bulk_operation_items`、仅本人可读 RLS 与 `bulk-organize` 受信 Edge Function；按 50 条有界批次幂等执行，逐关系记录成功、可重试失败与终止失败，刷新后可继续，仅重试可重试项，并允许明确结束剩余终止失败。Web 提供 en / zh-CN、键盘选择、移动宽度布局与权威查询恢复；自动化覆盖状态迁移、幂等、授权边界、选择快照、部分重试和 tag / collection 路径。

> 未保存笔记弹窗用关闭代替「继续编辑」（2026-07-17，见 `logs/2026-07-17-unsaved-note-close-affordance.md`）：确认层恢复与 Quick Look 一致的关闭按钮，语义等同继续编辑；页脚只保留放弃 / 保存。

> Dialog 密度与标题关闭对齐（2026-07-17，见 `logs/2026-07-17-dialog-density-alignment.md`）：共享 Dialog 默认收敛为 448px / 20px，关闭按钮与标题同顶边垂直居中；标签 / 集合 / 确认弹窗页脚改用 `size="sm"`，与未保存笔记确认层一致。

> Quick Look 新建标签误关闭（2026-07-17，见 `logs/2026-07-17-quick-look-create-tag-dismiss.md`）：浮窗 `pointerdown` 窗外关闭此前未豁免 Radix Portal 的 menu / dialog，导致「添加标签 → 新建标签」时窗口先卸载、表单无法出现；现与键盘路径共用 portaled overlay 豁免，真实窗外点击仍关闭。

> 滚动边界统一（2026-07-17，见 `logs/2026-07-17-scrollbar-edge-alignment.md`）：README 桌面 Outline 的滚动盒跨过卡片右侧 padding，使轨道贴卡片内边缘且标题固定；Browse 将真实 `overflow-y-auto` 提升为页面全宽层，内容继续由 `px-6` + `max-w-6xl` 居中限宽，使列表/空态滚动条贴 App Shell 主内容区右边缘。虚拟列表仍绑定同一真实滚动元素，工具栏固定、scroll margin、视图切换归零与全局细滚动条样式保持不变。

> README corpus fidelity gate（2026-07-17，见 `logs/2026-07-17-readme-corpus-fidelity.md`、Issue #10）：固定 corpus 覆盖普通 GFM / 深目录 / badge 居中 / 宽表与代码 / 多语言代码块 / 相对媒体 / details / 富内容降级 / 中文 / 无 README；Vitest 清洗与 outline 门禁 + DEV `/dev/readme-corpus` lab；相对图片路径按仓库根 URL 规范化，越界 `../` 丢弃 `src`；Cursor 内置浏览器完成 light/dark 与 390/900/1200 视觉与 a11y 抽查。父 epic Issue #2 随 #10 关闭。

> Quick Look ↔ README progressive motion（2026-07-17，见 `logs/2026-07-17-readme-workspace-motion.md`、Issue #9）：浮窗 Quick Look 进入 README 时测量实际位置并以 Web Animations FLIP + ease-out 展开到主阅读区，仓库身份保持锚点、框体与正文 crossfade 分离；返回仅在来源恢复且同一仓库 trigger / Quick Look 可见时收缩，否则克制 crossfade。动画缺失/失败/reduced-motion 不阻挡路由与加载；手机 Sheet 不伪造空间展开。

> README 返回恢复来源上下文（2026-07-17，见 `logs/2026-07-17-readme-return-source-context.md`、Issue #8）：进入 README 时记录 Browse 筛选/排序/视图/滚动或 Collection 滚动与身份；可见返回与浏览器 Back 共用协调器，恢复快照后在仓库仍可见时重开 Quick Look，集合缺失回退 Browse，trigger 不可见时不强制滚动。

> README 仓库身份居中（2026-07-17，见 `logs/2026-07-17-readme-header-centered-identity.md`）：工作区 header 从顺序 flex 改为 `1fr / auto / 1fr` 对称三列，返回动作与 Outline / GitHub 操作分别锚定两侧，仓库身份保持几何居中且在窄空间安全截断；44px 移动触控目标、焦点语义与自适应 Outline 行为保持不变。

> README 自适应目录与 section 深链（2026-07-17，见 `logs/2026-07-17-readme-outline-deep-links.md`、ADR 0011）：最终清洗 HTML 经单一 Outline 模块补全稳定 heading target，兼容标题型 h1 排除、真实 h1 section、层级跳跃、GitHub anchor、重复/中文标题与空目录；主容器 `≥1100px` 使用实体 rail、`768–1099px` 使用 header Popover、`<768px` 使用底部 Sheet，长分支围绕 active section 折叠。选择条目更新 hash、滚动并聚焦 heading；自然滚动以 history replace 同步 active hash，复制深链在内容加载后恢复，reduced motion 禁用 smooth scroll。

> README 工作区端到端路径（2026-07-16，见 `logs/2026-07-16-readme-workspace-path.md`、ADR 0011）：Repo Quick Look 新增双语、全宽、44px 的 Read README 导航行；`/repos/:owner/:name` 重定向到 `/readme` 工作区，App Shell 保持挂载并立即呈现仓库身份、来源感知返回与文档骨架。新增 `packages/db` 查询链与 `read-repo-readme` Edge Function，在任何 GitHub 请求前校验会话和 `user_stars` 成员关系；返回的 GitHub HTML 不持久化，并经 DOMPurify + 显式允许列表清洗后使用固定本地 Markdown 样式渲染。Browse / Collection / 直链返回、en / zh-CN、成员拒绝与未保存笔记全部决策已有路由级回归测试。

> README 缓存与恢复状态（2026-07-16，见 `logs/2026-07-16-readme-fetch-recovery.md`、ADR 0011）：README 数据链完成 success / no README / not in library / rate limit / reconnect / retryable typed outcomes；所有状态留在 App Shell 内并提供上下文化恢复操作。provider token 只进入当前函数请求且不进入 key 或持久层；TanStack Query 以稳定 key 进行并发去重和 5 分钟内存 freshness，ETag 经 Edge Function 转为 GitHub `If-None-Match`，304 复用匹配内存 HTML。

> README 内容安全与链接边界（2026-07-16，见 `logs/2026-07-16-readme-content-security.md`、ADR 0011）：DOMPurify 后继续执行显式 tag / attribute / class allowlist，移除脚本、表单、可执行 embed、危险 scheme、事件属性及可覆盖 App Shell 的 utility class，同时保留 GitHub 常见结构、badge、居中内容、代码与 details。fragment 点击更新当前 README 路由 hash，并聚焦、滚动至匹配目标；仓库相对文件/目录分别解析为 GitHub `blob` / `tree`，全部离站链接统一为安全新标签页，异常媒体与不支持结构安全降级。

> README 响应式文档画布（2026-07-16，见 `logs/2026-07-16-readme-responsive-canvas.md`、ADR 0011）：`@asterism/ui` 新增显式 content / skeleton canvas variants，共享实体 card、60rem 最大宽度与响应式 padding；Asterism 原创 MIT `readme-document-v1.css` 固定覆盖 GFM、HTML-heavy header、badge、媒体、表格、代码和 details。大图保持比例，宽表/代码局部滚动，loaded 以 160ms opacity crossfade 进入并遵循 reduced motion；紧凑 header 在窄屏保留返回、仓库身份与 GitHub 图标。

> Repo Quick Look 可移动窗口（2026-07-16，见 `logs/2026-07-16-repo-quick-look-drag.md`）：桌面/平板浮窗默认位于右下角 24px，高度随内容收缩且最多 736px；以完整仓库身份首行为拖动区域且不增加冗余 drag icon，pointer 拖动使用 transform 保持流畅并限制在视口安全边距内，窗口 resize 后自动回收到可见范围，手机 Sheet 不启用拖动。

> Repo Quick Look 仓库链接统一（2026-07-16，见 `logs/2026-07-16-repo-quick-look-link-consistency.md`）：浮窗头部由分行 owner / repo + 独立 external-link 图标收敛为单行 `owner / repo` 主链接；弱化 owner、以链接蓝强调 repo name，并与 Browse 卡片和表格共享“仓库身份离站”的交互模型。

> 未保存笔记弹窗布局修正（2026-07-15，见 `logs/2026-07-15-unsaved-note-dialog-layout.md`）：确认弹窗从通用 512px / 24px 密度收敛为 448px / 20px，并压缩重复说明和动作文案；三个互斥动作取消左右分裂并真正收拢为右对齐决策组，窄屏使用同宽单列。

> 字体层级修正（2026-07-15，见 `logs/2026-07-15-repo-inspector-typography.md`）：Repo Table 与 Repo Inspector 重排为连续的 13px 身份/正文、12px 常规元数据、11px Activity/紧凑元数据；Inspector 仓库名由 22px/Bold 收敛为 18px/SemiBold。数字与日期统一 Geist Mono + tabular numerals；同时修复 `tailwind-merge` 误删自定义语义字号 class 的根因，并以用户 Chrome computed style 验证最终层级。

> Repo Quick Look（2026-07-15，见 `logs/2026-07-15-repo-quick-look.md`、ADR 0010）：移除低价值的 Pin / Expand / Peek / Focus 与桌面停靠布局；桌面右侧、平板居中使用非模态 portal 悬浮窗，手机保留底部 Sheet，主内容打开前后尺寸与位置完全不变。保留 J/K、虚拟列表定位、焦点恢复与未保存笔记三选项保护。

> 分段切换器统一（2026-07-15，见 `logs/2026-07-15-settings-segmented-control-consistency.md`）：Settings 主题切换从独立 solid 轨道收敛为 Browse 使用的默认 glass 轨道，文本 / 图标两种内容表达共享同一表面、边框、圆角、选中态与动效规范。

> 空状态动作收敛（2026-07-15，见 `logs/2026-07-15-empty-state-action-hierarchy.md`）：Collections / Tags 在无数据时只保留空状态主体中的首次创建主操作，不再于页头重复显示；已有数据后恢复页头创建入口，标签搜索无结果仍保留追加能力。

> 加载反馈统一（2026-07-15，见 `logs/2026-07-15-loading-state-unification.md`）：移除 Browse 首次进入时 route Suspense 的大矩形闪烁，默认页改为直接加载；其余路由与 Browse / Collections / Tags / Collection Detail / Dashboard / Import Export 全部改为镜像真实结构的专属骨架。初始查询与后台刷新分离，Import Export 不再闪现假空态；同步改为真实 indeterminate 状态，保存 / 删除 / 恢复等写操作统一按钮内 pending 反馈、重复提交防护、i18n 与 reduced-motion / a11y 语义。

> 交互统一（2026-07-15，见 `logs/2026-07-15-browse-repo-name-link-consistency.md`）：Browse 宫格与表格的仓库名称统一为 GitHub 外链；表格整行的其余区域继续打开详情抽屉，并移除名称旁重复的 external-link 图标。两种视图由此共享“名称离站、容器看详情”的交互模型。

> 优化（2026-07-14，见 `logs/2026-07-14-browse-list-organization-responsive.md`、`logs/2026-07-14-browse-list-information-hierarchy-correction.md`、`logs/2026-07-14-browse-list-row-interaction.md`）：Browse 列表从固定 640px GitHub 元数据表格重构为响应式语义表格：整行打开详情、独立外链打开 GitHub，新增 Archived 与 Updated + Starred activity；最终桌面列收敛为 Repository / Language / Stars / Activity，标签 / 集合 / 笔记仅在存在时作为 Repository 次级上下文出现，不再用 Organization 独立列或“未整理”占位。桌面 64px、移动端堆叠且无横向滚动，虚拟行按实测高度校准并补 `aria-rowcount` / `aria-rowindex`。

> 视觉修复（2026-07-14，见 `logs/2026-07-14-browse-list-surface-alignment-polish.md`）：Browse 列表表面改用与 Repo Card 一致的 `--card`，以 `overflow: clip` 完整裁切圆角且不引入新的滚动容器；表头统一左对齐并与 cell 共用列模板和内边距。吸顶控制区移除贯穿视口的底部分隔线，改为无硬边界的 10px 渐隐背景。

> 信息层级修正（2026-07-14，见 `logs/2026-07-14-browse-list-information-hierarchy-correction.md`）：移除低信息密度的 Organization 列及重复“未整理”状态，为 Language 恢复 9rem 固定空间；表头改用 40px muted band、12px semibold 与更高对比度，和 12px regular metadata 形成稳定层级。

> 交互修正（2026-07-14，见 `logs/2026-07-14-browse-list-row-interaction.md`）：Browse 列表由名称按钮改为整行打开详情；行支持 click、Enter 与 Space，并提供整行 hover / focus 状态。GitHub external-link 是唯一离站入口，显式隔离 click 与 keyboard 冒泡。

> 优化（2026-07-14，见 `logs/2026-07-14-contextual-github-reconnect.md`）：GitHub 授权恢复从横跨 App Shell 的持久 banner 重构为上下文化状态：Topbar Sync 原位切换为 warning Reconnect，User Menu 提供简短状态说明和备用入口，Browse / Dashboard 空状态直接恢复；页面不再被局部同步问题推挤或阻断，短说明 tooltip 按内容宽度紧凑呈现。

> 优化（2026-07-14，见 `logs/2026-07-14-open-filter-toolbar.md`）：Browse 筛选栏移除包裹独立控件的冗余 GlassRail，改为筛选靠左、排序靠右的开放式工具栏；默认 facet 文案缩短为 Language / Topic，active 筛选使用克制的 primary 边框与背景，窄屏按组安全换行。

> 修复（2026-07-14，见 `logs/2026-07-14-nested-filter-overlay-dismissal.md`）：修正“更多筛选”内 Select 打开后点击父 Popover 会导致父子两层同时关闭的问题；父层在 Radix Select 的 modal pointer-event 隔离期间显式保持可交互，实现点击父层只收起子层、点击两层之外才全部关闭。

> 优化（2026-07-14，见 `logs/2026-07-14-form-control-focus-treatment.md`）：共享 Input、Textarea 与 SelectTrigger 移除 shadcn 默认 3px 蓝色外扩焦点环，统一改为主题感知的 `foreground/60` 中性边框聚焦态；错误态优先级、键盘可见性和其他交互组件的既有 focus ring 保持不变。

> 优化（2026-07-14，见 `logs/2026-07-14-browse-card-information-hierarchy.md`）：Browse 卡片重构为 208px 舒展四段式结构，用户标签优先于 GitHub topics，集合数量与笔记状态归入整理信息栏，Stars / Forks 与紧凑 Updated / Starred 时间组形成单基线 Footer；真实溢出的两行描述 hover 展示完整 tooltip。新增轻量笔记 repo ID 索引与批量集合计数，避免逐卡查询。整卡详情触发器与 GitHub 外链改为并列语义，骨架、虚拟化估算、en / zh-CN 与键盘焦点同步更新。

> 优化（2026-07-14，见 `logs/2026-07-14-browse-filter-hierarchy-and-facet-performance.md`）：Browse 筛选条从 7 个同级决策收敛为语言 / Topic / 标签 / 更多筛选 / 排序，Star 阈值、更新时间与状态进入带 active count 的次级弹层；语言与 Topic 改为固定高度搜索 picker，首开仅渲染 20 个选项、搜索最多渲染 50 个完整集合匹配项，消除高基数 Topic 下拉的超长菜单与同步挂载卡顿。新增共享 Popover 原语、en / zh-CN 文案与结果窗口单测；三处搜索放大镜收敛为共享 `SearchInputIcon`，统一使用 `black/60` 和正确前景层级。

> 优化（2026-07-13，见 `logs/2026-07-13-import-export-clarity.md`）：导出区从“先选格式、再点通用下载”的隐含两步交互改为 JSON / CSV / Markdown 三条直接下载路径；每种格式明确标注用途、数据范围与能否恢复，并移除低价值的原始文本预览。导入区改称“恢复备份”，明确只恢复已同步仓库的组织数据，不会新增 star 或仓库；en / zh-CN 文案同步更新。

> 视觉系统升级（2026-07-13，见 `logs/2026-07-13-graphite-glass-visual-system.md`、ADR 0009）：按 Impeccable 的 shape → colorize → critique → audit → polish 流程，将 Primer/独立 Lumno 色彩重构为 **Asterism Graphite Glass**。Light/Dark 使用冷蓝石墨灰阶，单一电光蓝统一品牌、主操作、链接、焦点与选中状态；玻璃严格限制在顶栏、搜索、筛选、切换器与浮层等交互层，内容卡片和图表保持实体表面。Logo、Dashboard 图表、Repo Card、Sidebar、Login、Drawer/Dialog 与共享 UI token 已同步；响应式触控目标、键盘激活、focus-visible、reduced-motion 与无 blur 降级完成。Impeccable detector 对 `apps/web/src`、`packages/ui/src` 均为 0 findings；lint/typecheck/test/build 全绿，核心颜色组合达到 WCAG 2.1 AA。

> 修复（2026-06-30，见 `logs/2026-06-30-sync-stars-deploy-fix.md`）：顶部栏「Sync」此前报通用错误，根因是 `sync-stars` Edge Function **从未部署**到项目（端点 404）。已 `supabase functions deploy sync-stars`（现 `ACTIVE v1`），并让 `invokeSyncStars` 透传函数返回的真实错误（`FunctionsHttpError.context`）+ toast 附 `description`，避免再吞错。`provider_token` 不持久化的局限不变（刷新后需重登）。**部署是每环境一次性手工步骤**。

> 修复（2026-07-06，见 `logs/2026-07-06-ui-dist-alias-fix.md`）：`packages/ui` 的 dev/watch 产物曾残留 `@/lib/utils`、`@/components/*` path alias，导致 Web Vite 消费 `@asterism/ui/dist` 时报 `[plugin:vite:import-analysis] Failed to resolve import "@/lib/utils"`。已将 `packages/ui/src` 内部导入改为相对路径并重建，`dist` 不再含 `@/` alias。

> 修复（2026-07-06，见 `logs/2026-07-06-github-session-reconnect.md`）：刷新/恢复 Supabase 会话后可能缺少 GitHub `provider_token`，此前点击 Sync 只提示 session 过期，但界面仍显示已登录且没有重新登录入口。已将「Asterism 已登录但 GitHub 授权需刷新」建模为独立状态：应用顶部显示提示条并提供唯一可见的 Reconnect GitHub 主入口，点击后立即显示 pending 反馈，账号菜单保留备用入口，并新增 web 侧 Vitest 回归测试。

> 修复（2026-07-06，见 `logs/2026-07-06-app-page-scrollbar.md`）：应用内页面级纵向滚动统一由 `AppLayout` 主内容区承担，Browse / Collection Detail 的仓库虚拟列表不再创建内部纵向滚动条，滚动条贴主内容区右边缘；全局 scrollbar thumb 调轻调细，局部弹层/菜单/代码预览滚动保留。

> 优化（2026-07-06，见 `logs/2026-07-06-browse-sticky-toolbar.md`）：Browse 页上下分栏，标题 + 筛选栏固定、仅列表区滚动；`main` 恢复统一 `p-6`，不再用 sticky 或各页面补 `pt-6`。

> 优化（2026-07-06，见 `logs/2026-07-06-card-tag-overflow.md`）：Browse 卡片视图的 GitHub topics 与用户自定义 tags 统一为单行 chip 行，按真实宽度动态折叠为 `+n`，hover/focus 展示剩余项 tooltip，避免长标签撑高卡片。

> 优化（2026-07-07，见 `logs/2026-07-07-glass-segmented-controls.md`）：设计系统新增按 Lumno 源码值对齐的 `GlassControlRow`、`GlassRail` 与滑块式 `SegmentedControl`（page noise、stuck row 背景/line、4px blur、4px inset、8px/14px tab padding、源码色值/动效），先落地 Browse 视图切换、Settings 主题切换与 Browse 筛选 rail；限定玻璃质感只作为控制区承托，不扩散到主卡片或列表行。

> 基础设施（2026-07-07，见 `logs/2026-07-07-agent-skills-vendor.md`）：新增项目级 agent skills 治理层 `knowledge/skills/`，vendor `vercel-labs/agent-skills` 的 React / composition / Vercel 部署与优化 skills，并同步到仓库内 `.agents/skills/`；根 `AGENTS.md` 已声明触发规则，后续 React 与 Vercel 相关任务需按需读取对应 skill，且本项目 contracts 优先。

> 修复（2026-07-07，见 `logs/2026-07-07-glass-control-fixes.md`）：复查磨砂控制条复刻发现三处偏差并修复——Browse 吸顶动效未接线（`GlassControlRow` 从未收到 `stuck`，已接入基于 `listScrollElement.scrollTop` 的检测）、Settings 主题切换误用磨砂吸顶条（`GlassRail`/`SegmentedControl` 新增 `variant: 'glass'|'solid'`，Settings 改用 `solid` 且去掉 `GlassControlRow` 包裹）、意外带回水彩背景图（已从 `app-layout.tsx` 移除引用）。尺寸/圆角/透明度/变换保留 Lumno 原始字面量不变；散落的硬编码颜色新增为专属 `--glass-*` token 集中管理，视觉零差异。

> 优化（2026-07-08，见 `logs/2026-07-07-browse-view-switch-perf.md`、`logs/2026-07-08-browse-tab-immediate-response.md`、`logs/2026-07-08-browse-tab-paint-boundary.md`）：Browse 宫格/列表切换收敛为最终方案——tab 本地选中态与 `SegmentedControl` 滑块立即响应；内容视图通过 double `requestAnimationFrame` 让出一次 paint 后再用 `startTransition` 提交；grid/list 首次访问后常驻挂载，后续仅 CSS 显隐，避免虚拟列表反复重建；视图偏好仍异步持久化到 Zustand/localStorage。

> 部署（2026-07-08，见 `logs/2026-07-08-vercel-prod-deploy.md`）：Asterism Web（`apps/web`，Vite SPA）首次部署到 Vercel **生产环境**，项目落在团队 `xcm1115s-projects`，生产稳定域名为 `https://asterism-xcm1115s-projects.vercel.app`。新增仓库根 `vercel.json` 固化 framework=vite、installCommand=`pnpm install`、buildCommand=`turbo run build --filter=@asterism/web`、outputDirectory=apps/web/dist 与 SPA 回退路由 `/ (.*) → /index.html`；将 `package.json` 的 `prepare` 脚本改为「仅在 git 仓库内安装 lefthook」，规避 Vercel 构建环境（无 `.git`）下 `pnpm install` 因 `lefthook install` 失败导致构建中止；`.gitignore` 增补 `.vercel/`。生产环境变量 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 沿用既有值（9 天前已配置，无需覆盖）。**关键后续**：需把生产域名加入 Supabase Auth 的 Site URL / Redirect URLs，否则 GitHub OAuth 登录回调会失败。

Phase 1 用户可见 slices 已完成（当前仍处工程收尾；见 `logs/2026-06-30-phase1-shell.md`、`logs/2026-06-30-phase1-slice3-stars-sync.md`、`logs/2026-06-30-phase1-slice4-browse.md`、`logs/2026-06-30-phase1-slice5-filter-search.md`、`logs/2026-06-30-phase1-slice6-tags-collections-notes.md`）：

- **契约裁决（ADR 0006）**：stars 同步写入走 Edge Function `sync-stars`（service role），客户端只触发 + 读取；修正 `architecture.md` 数据流与 `roadmap.md` 状态表。
- **Slice 0 设计系统地基**：`packages/ui` 增补一批 shadcn 组件（Card/Input/Textarea/Label/Badge/Avatar/Separator/Skeleton/Tabs/Tooltip/Dialog/Sheet/DropdownMenu/Select/Sonner）+ `ThemeProvider`/`ModeToggle`；`apps/web` 接 TanStack Query / Theme / Tooltip providers + Toaster，路由抽到 `router.tsx`；装 `@tanstack/react-query`、`@tanstack/react-virtual`、`zustand`、`lucide-react`。
- **Slice 1 登录页改稿**：按 Ardot `8:2` 拆出 `pages/login.tsx`（brand 面板 + GitHub OAuth 卡片 + 只读权限说明），明暗两套对齐设计稿；新增路由守卫 `RequireAuth`/`RequireAnon`。
- **Slice 2 应用外壳**：`AppLayout`（Sidebar 导航 + 顶部栏：搜索/Sync/语言/主题/账号菜单）+ 嵌套路由（Browse/Collections/Tags/Dashboard/Import-Export/Settings 骨架与空状态）；Settings 页已可用（主题、语言、账号登出、AI 区 Coming Soon）。
- **Slice 3 stars 同步（数据地基）**：`packages/core` GitHub GraphQL 同步（游标分页 + `starredAt` 增量，配 5 个 Vitest）；`supabase/functions/sync-stars` Deno 函数 service role 幂等 upsert `repos` + `user_stars`；`packages/db` 收紧 `Database` 泛型 + 读查询（`listStarredRepos`/`getLatestStarredAt`）+ `invokeSyncStars` + Dexie v2；`apps/web` Query hooks（`useStarredRepos`/`useSyncStars`）+ 顶部栏 Sync 按钮接函数与 sonner 进度反馈。
- **Slice 4 Browse（卡片/列表 + 虚拟滚动）**：`RepoCard`/`RepoListRow`/骨架组件；`RepoCollection` 用 `@tanstack/react-virtual` 行虚拟化 + 响应式列数（自带滚动容器）；视图模式存 Zustand（persist）；`useStarredRepos` 驱动 loading/error/empty/data 四态；`lib/format`（紧凑数字 + 相对时间）与语言色点；浏览器明暗双视图实测通过。
- **Slice 5 多维筛选 + 关键词搜索**：`packages/core` `repos/filter.ts`（filter/sort/facets/hasActive，11 个 Vitest）；`apps/web` Zustand 筛选态 + 顶部栏搜索接线 + `RepoFilterBar`（语言/topic/star/push/状态/排序 6 个 Select，facets 动态填充，可清除）；Browse useMemo 组合筛选排序 + 「无匹配」空态；浏览器实测语言筛选收窄计数与清除按钮。
- **Slice 6 标签 / 集合 / 笔记**：`packages/core` 增 `Tag`/`Collection`/`Note` 模型 + 标签调色板；`packages/db` 新增 tags/repo_tags/collections/collection_repos/notes 的 CRUD 查询（走 RLS 本人增删改、连接表 FK 级联），`StarredRepoRecord` 补 `repoId`；`apps/web` 五组 Query hooks + Repo Detail Drawer（标签胶囊增删 / 集合勾选 / 笔记编辑，对齐 Ardot `8:364`）+ Tags 管理页（`12:2`）+ Collections 管理页（`12:126`）+ 卡片点击打开 Drawer 并展示标签；i18n `common`/`drawer`/扩 `tags`/`collections`；浏览器明暗实测三处对齐设计稿。
- **Slice 6 补完**（见 `logs/2026-07-02-phase1-slice6-backlog-complete.md`）：`RepoFilter` 扩展 `tagIds` + Browse 多选标签筛选；`/collections/:id` 集合详情页；标签/集合表单重名前端校验。
- **Slice 7 统计仪表盘**（见 `logs/2026-07-02-phase1-slice7-dashboard.md`）：`packages/ui` shadcn Chart + recharts；`packages/core` `deriveDashboardInsights`；Dashboard 四 StatCard + 四图表（语言/趋势/topic/归档+标签 Top5），对齐 Ardot `8:413`。
- **Slice 8 导入/导出**（见 `logs/2026-07-02-phase1-slice8-import-export.md`）：`packages/core` v1 JSON/CSV/Markdown 数据端口 + Vitest；`packages/db` `importUserData` + `listNotes`；Import/Export 双栏页对齐 Ardot `12:182`。
- **工程 polish**：全路由 `React.lazy` + Suspense code-split（Dashboard 图表独立 chunk ~160KB）。
- **UI 像素级还原**（见 `logs/2026-07-02-ui-pixel-perfect.md`、`decisions/0007-typography-spacing-tokens.md`）：Ardot 11 frame 全量校对；Geist 字体 + 间距/字号 token 定稿；Shell/Browse 表格视图/Drawer/其余页面视觉对齐设计稿。
- **全局滚动条样式**（见 `logs/2026-07-02-scrollbar-styles.md`）：`packages/ui` 引入基于 `--muted-foreground` 的细 pill 滚动条，替换浏览器默认粗灰样式；Browse 内部滚动容器链路验收通过，无双滚动条。
- **移除 design 沙盒**（见 `logs/2026-07-02-remove-design-folder.md`）：删除本地 `design/` 目录；设计源统一为 Ardot + `ui-ux.md`。

> 说明：该段为历史完成记录；当前路线已由 ADR 0015 调整为 Phase 1 收尾后进入 Phase 2 AI（BYOK）+ 批量整理。

初始化（Initialization）已于 2026-06-29 完成（知识库 + 开源基础 + Monorepo 根配置 + 提交钩子 + 首次提交）。

Phase 0 本地骨架已完成事项（见 `logs/2026-06-29-phase0-scaffold.md`、`decisions/0004-phase0-scaffold-choices.md`）：

- Monorepo 实包就位：`packages/{config,core,ui,db}` 与 `apps/{web,extension,desktop}` 均为最小可构建骨架。
- 共享包骨架：`core`（领域类型占位 + 用例）、`db`（`createSupabaseClient` + Dexie 缓存占位，唯一数据访问入口）、`ui`（Tailwind v4 + shadcn neutral 主题 + `Button`）、`config`（tsconfig 预设）。
- `apps/web`：Vite + React Router + 最小 react-i18next（en/zh-CN），已 `import @asterism/{ui,core,db}` 打通依赖图。
- `apps/extension`：WXT（MV3）最小 popup；`apps/desktop`：占位包（Tauri 2 推迟 Phase 4）。
- 工程门全绿：`pnpm lint`（Biome）/ `pnpm typecheck` / `pnpm test`（Vitest）/ `pnpm build`（Turborepo）均通过。
- CI：`.github/workflows/ci.yml`（pnpm + Node 22，lint/typecheck/test/build）。
- `.env.example` 就位（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 占位，无真实值）。

拿到 Supabase Publishable key 后新增（见 `logs/2026-06-29-phase0-auth-schema.md`）：

- 环境变量对齐新命名：`VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY`（`.env.example`、`apps/web` 读取处、本地 `.env`）。本地 `.env` 已填真实值且被 gitignore，未提交。
- `packages/db` 新增 GitHub OAuth 辅助（`signInWithGitHub` / `signOut` / `getSession` / `onAuthChange`），仍为唯一数据/认证访问入口。
- `apps/web` 接通登录：Supabase 客户端单例 + `useSession` Hook + 登录/登出 UI（含 en/zh-CN 文案），登录走 GitHub OAuth 回流。
- `supabase/migrations/` 初始 schema + RLS（对齐 `contracts/data-model.md`）：核心 7 表 + 索引 + `updated_at` 触发器 + 预启用 `pgvector`；RLS 策略 `repos` 全局可读、其余按 `user_id` 隔离。应用与 OAuth 配置步骤见 `supabase/README.md`。

**验收已完成（2026-06-29）**：

1. ✅ 已应用 `supabase/migrations/`（schema + RLS）。
2. ✅ 已配置 GitHub OAuth App + Supabase GitHub provider + Redirect URLs。
3. ✅ 本地 `pnpm --filter @asterism/web dev` 验证「使用 GitHub 登录」回流并显示当前用户邮箱。

> 说明：业务实现仍为**占位**，尚未接入 stars 同步/查询逻辑；进入 Phase 1 开发需另行批准。

设计层对齐（2026-06-30，见 `logs/2026-06-30-globals-css-primer-sync.md`、`decisions/0005`）：

- `contracts/ui-ux.md` 配色 / 圆角定稿为 GitHub Primer 体系（dark 取自 Ardot 设计稿、light 为 Primer 官方配对，hex 为权威）。
- `packages/ui` 的 `globals.css` 已从 neutral oklch 占位同步为 Primer hex token：light/dark 两套完整（含 `--link` / `--brand-from` / `--brand-to` 扩展 + `@theme inline` 映射，`--radius: 0.5rem`），文字/交互对比度达 WCAG 2.1 AA，`pnpm lint` / `typecheck` / `build` 全绿。**字体 / 间距仍 TBD**。

## 里程碑清单

### Phase 0 · 脚手架（Scaffolding）

- [x] 在 `apps/{web,extension,desktop}`、`packages/{core,ui,db,config}` 建实包骨架
- [x] `packages/core`/`ui`/`db` 共享包最小可构建（含 TS 配置、入口、占位导出）
- [x] CI（GitHub Actions）跑通 lint / typecheck / test / build 基线
- [x] 落地初始 schema 与 RLS 迁移（对齐 `contracts/data-model.md`）—— 2026-06-29 已在 Supabase 应用
- [x] 打通 GitHub OAuth 登录：`packages/db` 辅助 + `apps/web` 登录/登出 UI；2026-06-29 本地端到端验证通过（登录回流并显示当前用户邮箱）

### Phase 1 · Web MVP

- [x] 设计系统地基（shadcn 组件库 + ThemeProvider/ModeToggle）+ 应用 providers（Slice 0）
- [x] 登录页对齐 Ardot 设计稿 + 路由守卫（Slice 1）
- [x] 应用外壳（Sidebar + 顶部栏 + 分区路由骨架/空状态；Settings 可用）（Slice 2）
- [x] 同步 GitHub stars（首次全量 + 增量；Edge Function `sync-stars` + db 读查询 + Sync UI）（Slice 3）
- [x] 仓库卡片/列表视图 + 虚拟滚动（TanStack Virtual）（Slice 4）
- [x] 多维筛选与搜索（语言/topic/star/pushed_at/归档 + 关键词，可组合可清除）（Slice 5）
- [x] 标签（tags）与集合（collections）管理（含 Repo Detail Drawer + 管理页）（Slice 6）
- [x] 笔记（notes）（Repo Detail Drawer 内编辑）（Slice 6）
- [x] 统计仪表盘（shadcn Charts）
- [x] 导入/导出
- [x] UI 像素级还原（Ardot 11 frame + collection-detail extrapolate；见 `logs/2026-07-02-ui-pixel-perfect.md`）

### Phase 2 · AI（BYOK）+ 批量整理

- [x] AI 自动分类/打标（有界生成、持久化逐项审阅、受信确认与批量执行恢复；2026-07-23 #15 / #16 / #17）
- [x] AI 整理 UI/UX 评审与修复（确认-执行解耦 ADR 0025、丢弃防呆、审阅乐观更新+全部批准、文案去数据库话术；2026-07-23，见 `logs/2026-07-23-ai-organization-uiux-critique.md`）
- [x] 类型化 Generation Provider Registry（2026-07-21 #13）
- [x] BYOK Connection / credential 持久化加密（`ai_provider_connections`）（2026-07-21 #13）
- [x] 批量 tags / collections / export 与部分失败重试（2026-07-19 #11 + 2026-07-20 #12）

### Phase 3 · 浏览器扩展

- [ ] WXT（MV3）popup 快速搜索
- [ ] content-script 页内打标签/写笔记
- [ ] 与 Web 共享 Supabase 会话
- [ ] 扩展 `_locales` 国际化

### Phase 4 · 桌面端

- [ ] Tauri 2 套壳复用 Web 前端
- [ ] 桌面端打包与发布流程
