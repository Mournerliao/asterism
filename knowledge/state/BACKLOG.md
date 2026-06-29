# BACKLOG · 待办与已知开放项

> 持久状态层（Durable State）。本文件汇总**尚未解决的开放问题、待确认决策、未落地的工作项**。
> 与其他文件分工：里程碑/阶段进度看 `PROGRESS.md`；轻量便签看 `NOTES.md`；阶段功能拆分看 `roadmap.md`；已定的重大决策看 `decisions/*`。
> 维护约定：解决一项就勾选并简述结论；若上升为正式决策，迁移到 `decisions/` ADR 并在此留指针。

## 待确认 / 开放问题

- [ ] **配色与设计 tokens 待定**：色板/字体/间距/圆角/明暗等由用户用**外部设计工具**产出后，填入 `contracts/ui-ux.md`（当前占位）。tokens 落定前不要凭空造风格。
- [ ] **公共实例域名待定**：当前占位 `asterism.dev`，最终域名待确认后同步 `README.md` 与 `runbooks/self-host.md`。
- [ ] **a11y 目标确认**：暂定 **WCAG 2.1 AA**，待最终确认并写入 `contracts/ui-ux.md`。
- [ ] **是否加入匿名遥测**：默认**不加**（隐私优先）；如要加，需明确采集范围、可关闭开关与隐私说明，先讨论再实现。
- [ ] **LICENSE 署名确认**：MIT，版权年份 2026，**署名占位待确认**（个人/组织名）。
- [ ] **测试策略深度**：需明确单测/集成/E2E 的边界与覆盖目标（Vitest 已选为基线），写入 `contracts/conventions.md`。

## 未落地的工作项（基础设施）

- [ ] **CI（GitHub Actions）未建**：尚未配置流水线（lint / typecheck / test / build）。属 Phase 0 范畴。
- [ ] **发布工程细化**：Changesets 已配根，但发布流程（版本、changelog、tag）待 Phase 0+ 跑通。

## 未来任务（按阶段）

详见 `knowledge/roadmap.md` 的阶段拆分：

- [ ] **Phase 0 · 脚手架**：Monorepo 实包、共享包骨架、Supabase 项目 + schema + RLS、GitHub OAuth 打通
- [ ] **Phase 1 · Web MVP**：同步 stars、卡片/列表 + 虚拟滚动、多维筛选与搜索、标签、集合、笔记、统计仪表盘、导入导出
- [ ] **Phase 2 · 扩展**：WXT popup 快搜 + content-script 页内操作、共享会话
- [ ] **Phase 3 · AI（BYOK）**：pgvector 向量化、语义搜索、AI 自动分类、Edge Functions
- [ ] **Phase 4 · 桌面**：Tauri 2 套壳
