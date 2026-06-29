# 0003 · 提交规范用 commitlint，Git 钩子用 lefthook

- Status: Accepted
- Date: 2026-06-29

## Context（背景）

Asterism 是面向多人协作的 OSS 项目，希望从第一天起就有：

- **一致的提交历史**：可自动生成 changelog（配合 Changesets）、可读、可追溯。
- **自动化质量门**：提交前做格式化/lint，提交信息不合规直接拦截，减少人工 review 负担。
- **跨平台、低摩擦**的 Git 钩子方案，贡献者安装简单、执行快。

需要确定两件事：提交信息规范 + 校验工具，以及 Git 钩子管理器。

## Decision（决策）

- **提交规范**：采用 **Conventional Commits**，由 **commitlint + `@commitlint/config-conventional`** 校验。
- **Git 钩子管理**：采用 **lefthook**：
  - `commit-msg` → 运行 commitlint，校验提交信息；
  - `pre-commit` → 运行 **Biome**（lint + format）对暂存文件做检查。
- **生效时机**：**从第一次提交起即生效**（在初始化阶段一并安装钩子工具链并 `lefthook install`）。
- **提交信息风格**：**subject 用英文** `type(scope): 简短摘要`，**body 用中文**详述动机/取舍。该风格与 Conventional Commits 完全兼容（规范只约束 subject 的 `type(scope):` 结构，body 语言不限）。

示例：

```text
feat(web): add star list virtual scrolling

为大列表引入虚拟滚动，避免一次渲染上万条 star 卡片导致卡顿。
仅渲染可视区域 + 缓冲区，滚动时复用 DOM 节点。
```

## Consequences（影响）

正面：

- 提交历史结构化，便于自动生成 changelog 与版本推断（与 Changesets 协作）。
- 不合规提交在本地即被拦截，CI 负担与 review 噪音降低。
- lefthook 为单个 **Go 二进制**，**启动快、支持并行执行命令、配置为简单 YAML**（`lefthook.yml`），跨平台一致。

负面 / 需注意：

- **需要安装钩子工具链**（lefthook、`@commitlint/cli`、`@commitlint/config-conventional`、`@biomejs/biome`）并执行一次 `lefthook install`，属于初始化阶段的一次**受限安装**，以保证首次提交即被校验。
- 贡献者克隆后需执行 `pnpm install`（`prepare` 脚本会自动 `lefthook install`）才能装好本地钩子；CI 侧仍应独立跑 lint/commitlint 作为兜底，避免本地绕过。
- 钩子应能被显式跳过仅限紧急情况（`--no-verify`），项目约定**默认禁止绕过**，必要时需在 PR 说明原因。

## Alternatives considered（备选方案）

1. **husky（+ lint-staged）**
   - 优点：生态最广、文档多。
   - 缺点：基于 Node 脚本与 shell，钩子执行相对慢、配置较零散；并行能力依赖额外工具（lint-staged）。lefthook 单二进制 + 原生并行 + 单一 YAML 更简洁高效，故选 lefthook。

2. **simple-git-hooks**
   - 优点：极简、零依赖运行。
   - 缺点：功能较少（无内置并行/分组/glob 过滤的完整能力），扩展性弱于 lefthook，不利于后续增加更多钩子任务。

3. **仅靠 CI 校验、不在本地装钩子**
   - 优点：贡献者零本地负担。
   - 缺点：反馈延迟到 CI 才出现，体验差、浪费 CI 资源；本地钩子能在提交瞬间拦截问题，二者应是"本地钩子 + CI 兜底"互补而非二选一。
