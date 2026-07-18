# 0014 · Phase 1 只承诺可自部署

- Status: Accepted
- Date: 2026-07-18

Phase 1 的部署承诺是 **self-deployable（可自部署）**：用户使用自己控制的 Supabase Cloud 项目与静态托管环境，按仓库文档完成 migrations、GitHub OAuth、Edge Functions、环境变量和 Web 部署。**Fully self-hosted（完全自托管）**特指用户自行运行完整 Supabase 基础设施，不属于 Phase 1；项目暂不维护自有 Docker Compose。这个边界保留数据与部署自主性，同时避免把完整 BaaS 基础设施运维错误地纳入 Web MVP。
