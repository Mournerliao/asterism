# Contributing to Asterism

Thanks for your interest in contributing! Asterism is an open-source,
self-hostable GitHub Star manager. This guide covers local setup, our
conventions, and how we keep the project's knowledge base trustworthy.

> The knowledge base in [`knowledge/`](knowledge/) is the **single source of
> truth** for this project. Before starting any non-trivial change, read the
> relevant contracts in `knowledge/contracts/` and the current
> `knowledge/state/PROGRESS.md`.

## Prerequisites

- **Node 22** — the version is pinned in [`.nvmrc`](.nvmrc). With `nvm`, run
  `nvm use` (or `nvm install`) in the repo root.
- **pnpm** — the repo's package manager (locked via the root `packageManager`
  field). Enable it with `corepack enable` if you don't already have it.

## Dev setup

```bash
# Use the pinned Node version
nvm use

# Install dependencies (also installs git hooks via the prepare script)
pnpm install
```

This is a **Turborepo** monorepo managed with pnpm workspaces (`apps/*`,
`packages/*`). Common tasks are run from the repo root and orchestrated by
Turborepo:

```bash
pnpm lint      # Biome lint
pnpm format    # Biome format
pnpm test      # Vitest
pnpm build     # build all packages/apps
```

> Note: Asterism is in early initialization — most workspaces and scripts do not
> exist yet. The commands above describe the intended workflow as packages land.

## Commit convention

We use **[Conventional Commits](https://www.conventionalcommits.org/)**,
enforced by **commitlint** and run automatically via **lefthook** git hooks.

- **Subject in English**, format: `type(scope): short summary`
  - Examples: `feat(web): add tag filter`, `fix(core): handle empty star list`,
    `docs(knowledge): update product contract`.
  - Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`,
    `ci`, `perf`, `style`.
- **Body in Chinese (中文)** — explain the *why* and any context, wrapped at a
  reasonable width.
- **Never bypass hooks.** Do not use `--no-verify`, `--no-gpg-sign`, or otherwise
  skip the commit-msg / pre-commit checks. If a hook fails, fix the underlying
  issue and commit again.

Example:

```text
feat(web): add collection sidebar

新增左侧集合导航，支持创建与切换集合；空状态给出引导文案。
```

## Code style

- **Biome** handles both linting and formatting.
  - Check: `pnpm lint`
  - Auto-format: `pnpm format`
- **TypeScript strict** across the monorepo.
- Avoid narrating comments. Comments should explain non-obvious intent or
  trade-offs, not restate what the code does.
- The `pre-commit` hook runs Biome on staged files — keep your changes clean
  before committing.

## Keeping the knowledge base current

Asterism is built around its knowledge base. When your change affects behavior,
scope, or decisions, update [`knowledge/`](knowledge/) in the **same** PR:

- **Contracts** — update `knowledge/contracts/` when product scope, architecture,
  data model, conventions, or UI/UX rules change.
- **Decisions** — record meaningful technical decisions as ADRs in
  `knowledge/decisions/` (one decision per file: context, trade-offs, conclusion).
- **State** — keep `knowledge/state/PROGRESS.md`, `NOTES.md`, and `BACKLOG.md`
  current so the next session (human or agent) can resume without guesswork.
- **Logs** — record notable work sessions / loops in `knowledge/logs/`.

A change that alters behavior without updating the knowledge base is incomplete.

## Releases

Versioning and changelogs are managed with **[Changesets](https://github.com/changesets/changesets)**.
Packages use the `@asterism/*` scope.

- When your change should be released, add a changeset: `pnpm changeset` and
  describe the change. Shared packages are currently private workspace packages
  (not published to npm); Changesets is used for versioning and changelogs.

## Pull request process

1. **Fork & branch** from `main` with a descriptive branch name
   (e.g. `feat/tag-filter`).
2. **Make focused changes** — keep PRs scoped to one concern where possible.
3. **Run checks locally**: `pnpm lint`, `pnpm test`, and `pnpm build` as relevant.
4. **Update `knowledge/`** for any behavior/scope/decision changes (see above).
5. **Add a changeset** if a release is warranted.
6. **Open the PR** with a clear English title (Conventional Commits style) and a
   description explaining the *why*. Reference related issues.
7. **Pass CI and review.** Address feedback; do not bypass hooks or checks.

## Code of conduct

Be respectful and constructive. We want Asterism to be a welcoming project for
contributors of all backgrounds.

---

## 中文说明

- 知识库 [`knowledge/`](knowledge/) 是项目的**单一事实源**；动手前先读
  `knowledge/contracts/` 与 `knowledge/state/PROGRESS.md`。
- 环境：Node 22（见 [`.nvmrc`](.nvmrc)）、pnpm；`pnpm install` 会顺带安装 git
  钩子。这是基于 Turborepo 的 monorepo。
- 提交规范：Conventional Commits，由 commitlint + lefthook 自动校验。
  **subject 用英文** `type(scope): ...`，**正文（body）用中文**；**禁止绕过钩子**
  （不要用 `--no-verify`）。
- 代码风格：Biome（`pnpm lint` / `pnpm format`），TypeScript strict，避免叙述性
  注释。
- 发布：使用 Changesets，包遵循 `@asterism/*`。
- 改动若影响行为/范围/决策，请在同一个 PR 内同步更新 `knowledge/`（契约、ADR、
  状态、日志）。
