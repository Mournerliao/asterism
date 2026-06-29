# 0002 · 包管理器选用 pnpm（+ Turborepo），暂不用 Bun

- Status: Accepted
- Date: 2026-06-29

## Context（背景）

Asterism 是一个 Monorepo，技术栈包含 **Vite**（Web）、**WXT**（浏览器扩展，MV3）、**Turborepo**（任务编排）、未来还有 **Tauri 2**（桌面）。需要选定一个包管理器，要求：

- 与 Vite / WXT 的依赖优化（dep optimizer）兼容、稳定；
- 在 workspace（多包）下处理传递性依赖（含 CJS）无"幽灵依赖/提升"footgun；
- 与 Turborepo 协作良好（lockfile 可被解析以做受影响包计算与缓存）；
- 贡献者本地可复现，安装稳定可靠。

候选主要是 **Bun**（一体化、安装快、自带 runtime/test）与 **pnpm**（成熟、严格的 node_modules 结构、生态广泛）。本决策评估了 Bun 用于上述 Vite/WXT/Turborepo/Tauri 组合的可行性。

## Decision（决策）

采用 **pnpm** 作为包管理器，并以 **Turborepo** 做任务编排。在 `package.json` 用 `packageManager` 字段锁定 pnpm 版本，工作区由 `pnpm-workspace.yaml` 定义（`apps/*`、`packages/*`）。

暂不采用 Bun 作为该栈的包管理器/工作区方案。

## Consequences（影响）

正面：

- pnpm 的内容寻址 + 符号链接结构对该栈最成熟稳妥，**无 hoisting footgun**（默认不提升，避免幽灵依赖），依赖边界清晰。
- 与 Vite / WXT 的 dep optimizer 协作经过大量社区验证，问题面小。
- Turborepo 能稳定解析 `pnpm-lock.yaml`，受影响包计算与远程/本地缓存可靠。
- 贡献者复现性好（锁定版本 + 严格结构），降低"在我机器上能跑"类问题。

负面 / 需注意：

- 相比 Bun 一体化（runtime + 包管理 + test）需要额外搭配（Vite/Vitest/Biome 等），但这些本就是既定栈，影响有限。
- 安装速度通常不及 Bun，但可通过 CI 缓存与 pnpm store 缓解，差异在可接受范围内。

## Alternatives considered（备选方案）

### Bun（被本阶段否决）

评估中发现两类阻塞性问题：

1. **Vite × Bun-workspaces 的传递性 CJS 提升坑**
   - 在 Bun workspaces 下，传递性 **CJS** 依赖会被存放到 `node_modules/.bun` 路径中，导致 **Vite 依赖优化器（dep optimizer）失败**：表现为 `504 Outdated Optimize Dep`，或 CJS 模块以原始形式经 `/@fs` 直出（未被正确预打包），引发运行时/加载错误。这对 Vite（Web）和 WXT（扩展）开发体验是直接阻塞。

2. **Turborepo 对 lockfile 版本敏感**
   - **Bun 1.4 生成 lockfileVersion 2** 的锁文件，稳定版 Turborepo 当时**无法解析**该版本，导致受影响包计算 / 缓存能力受损（Turbo 依赖解析 lockfile 来构建依赖图）。

综合：Bun 在该具体栈（Vite/WXT/Turborepo/Tauri）下当前不够稳，故本阶段否决。

### 重新评估 Bun 的前提与缓解（Mitigation）

若未来重新评估 Bun，建议同时满足以下条件再试：

- **锁定 Bun 1.3.x**，使用 **lockfileVersion 1** 的锁文件，以规避 Turborepo 解析问题；
- 在受影响项目的 Vite 配置中，将相关 **CJS 依赖显式加入 `optimizeDeps.include`**，绕过传递性 CJS 提升导致的 dep optimizer 失败；
- 用一个最小可复现 Monorepo（Vite + WXT + Turborepo）跑通 dev / build / test，确认 `504 Outdated Optimize Dep` 与 `/@fs` 原始 CJS 直出问题不再出现后，再行切换并更新本 ADR。

其它包管理器（npm / yarn）未作为主选评估：在该栈下相对 pnpm 无明显优势（npm workspaces 提升行为、yarn PnP 与生态兼容性等各有取舍），pnpm 综合最优。
