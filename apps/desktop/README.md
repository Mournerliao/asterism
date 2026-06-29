# @asterism/desktop

桌面端占位包。按 [`knowledge/roadmap.md`](../../knowledge/roadmap.md) 的规划，桌面端属于
**Phase 4**：用 **Tauri 2** 套壳复用 `apps/web` 的前端产物。

## 为什么现在只是占位

Phase 0 脚手架的目标是「最小可构建骨架 + CI 纯 Node 跑通」。引入真正的 Tauri 运行时会带来
Rust 工具链依赖，使本地与 CI 变重；因此本阶段仅保留包骨架，`build` 为占位脚本，不产出构建物。

## Phase 4 计划

- 初始化 `src-tauri/`（Tauri 2），在 CI 中按需引入 Rust 工具链。
- 复用 `apps/web` 的构建产物作为前端。
- 补充桌面端打包与分发流程。
