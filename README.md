# Asterism

> Chart your stars. A whole sky of GitHub stars, finally in constellations.

**Asterism** is an open-source, self-deployable manager for your GitHub Stars. It
turns a sprawling, unsearchable list of starred repositories into an organized
sky — tag them, group them into collections, take notes, and find repositories
through keyword search and structured filters. The responsive Web app, AI-assisted
organization, and bulk workflows are complete; the browser extension and desktop
app follow next.

> Status: **Phase 2 AI (BYOK) + bulk organization complete.** The responsive Web
> application, real Supabase flows, encrypted Generation Connections, reviewable
> AI organization drafts, and recoverable bulk workflows are environment-tested.
> Phase 3 is the browser extension; contracts and roadmap live in
> [`knowledge/`](knowledge/).

---

## Why Asterism

GitHub Stars are easy to collect and almost impossible to use. Once you cross a
few hundred, the built-in list offers no tags, no notes, no real search, and no
way to think about what you saved. Asterism is the layer on top: an *asterism*
is a recognizable pattern picked out of countless stars — exactly what this tool
helps you do with yours.

## Features

A short overview — see [`knowledge/contracts/product.md`](knowledge/contracts/product.md)
for the authoritative feature scope and acceptance criteria.

- **Sync your stars** from GitHub and keep them up to date.
- **Tags & collections** to organize repositories your way.
- **Notes** on any repository, kept private to you.
- **Search & filtering** across repository name/description, language, topics,
  tags, star count, update time, and archive status.
- **Stats dashboard** to understand your stars at a glance.
- **Import / export** so your data stays yours.
- **AI (BYOK)** — reviewable organization suggestions using your own encrypted
  Generation Connection; models never write organization data without confirmation.
- **i18n** — English by default, with built-in Simplified Chinese (`zh-CN`).

## Tech stack

- **Language:** TypeScript (strict)
- **UI:** React + Tailwind CSS + shadcn/ui, `react-i18next`
- **State / data:** TanStack Query, Zustand, Supabase Postgres
- **Backend:** Supabase (Auth + Postgres + Edge Functions)
- **Web:** Vite + React + React Router
- **Extension (later):** WXT (MV3)
- **Desktop (later):** Tauri 2
- **Tooling:** Node 22 · pnpm · Turborepo · Biome · Vitest · Changesets · lefthook + commitlint

See [`knowledge/contracts/architecture.md`](knowledge/contracts/architecture.md)
for the full architecture contract.

## Monorepo layout

A Turborepo + pnpm workspace. The current repository contains the Web app,
shared packages, future platform shells, migrations, and deployed-function source.

```text
asterism/
├── apps/
│   ├── web/          # Responsive web SPA (Vite + React) — first target
│   ├── extension/    # Browser extension (WXT, MV3) — later
│   └── desktop/      # Desktop app (Tauri 2) — later
├── packages/
│   ├── core/         # Business logic: GitHub API, sync, domain models
│   ├── ui/           # Shared UI components (shadcn/ui + Tailwind)
│   ├── db/           # Data access: Supabase client + queries
│   └── config/       # Shared config
├── supabase/         # Migrations + Edge Functions
└── knowledge/        # Single source of truth: contracts, decisions, loops, state, logs
```

## Project knowledge & pointers

- **[`knowledge/`](knowledge/)** — the single source of truth. Contracts,
  decisions (ADRs), roadmap, loops, durable state, and run logs all live here.
  Start any work by reading the contracts and `knowledge/state/PROGRESS.md`.
- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — dev setup, commit conventions, and
  how to keep the knowledge base in sync.
- **[`AGENTS.md`](AGENTS.md)** — the entry contract for AI agents working in this repo.
- **Self-host runbook** — [`knowledge/runbooks/self-host.md`](knowledge/runbooks/self-host.md).

## License

[MIT](LICENSE) © 2026 Mournerliao

---

## 中文简介

**Asterism** 是一个开源、可自部署的 GitHub Star 管理器。它把杂乱、难以检索的
star 列表整理成一片有序的星空：打标签、归集合、写笔记，并通过关键词和结构化筛选查找仓库。
优先完成响应式 Web，随后交付 AI（BYOK）与批量整理，再推出浏览器扩展与桌面端。

> 当前状态：**Phase 2 AI（BYOK）+ 批量整理已完成。** 响应式 Web、真实 Supabase 核心链路、
> 加密 Generation Connection、可审阅 AI 整理草稿与可恢复批量操作均已验收；下一阶段为浏览器扩展，
> 架构与路线图见 [`knowledge/`](knowledge/)。

- 功能、技术栈与目录结构详见上文英文部分，权威功能范围见
  [`knowledge/contracts/product.md`](knowledge/contracts/product.md)。
- 知识库 [`knowledge/`](knowledge/) 为**单一事实源**；任何工作请先阅读
  `contracts/` 与 `knowledge/state/PROGRESS.md`。
- 贡献方式见 [`CONTRIBUTING.md`](CONTRIBUTING.md)，自托管见
  [`knowledge/runbooks/self-host.md`](knowledge/runbooks/self-host.md)，AI 代理约定见
  [`AGENTS.md`](AGENTS.md)。
- 国际化：默认英文，内置简体中文（`zh-CN`）。开源协议：MIT。
