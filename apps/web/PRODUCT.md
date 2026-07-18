# Product

> This file is the impeccable-facing summary of Asterism's product context, kept in sync with `knowledge/contracts/product.md` and `knowledge/contracts/ui-ux.md` (Brand Tone section) at the repo root. **Those contracts are the single source of truth** (see root `AGENTS.md`); if this file and the knowledge base ever disagree, the knowledge base wins and this file should be updated to match.

## Register

product

## Users

- **重度 star 用户**：starred 仓库数以百计甚至上千，靠 GitHub 原生功能已无法有效管理。
- **技术内容整理者**：需要给收藏打标签、写笔记、按主题归集，沉淀为个人技术资料库。
- **跨设备 / 跨端用户**：希望在浏览器、扩展、桌面之间共享同一份组织好的收藏。
- **注重数据自主**：偏好开源、可自部署、数据可导出的方案。

Context: developers, at their desk, mid-workflow — searching for a repo they starred months ago, or triaging a fresh batch of stars into tags/collections. The job is retrieval and organization, not discovery/browsing for pleasure.

## Product Purpose

Asterism 是一个**开源、多端、可自部署**的 GitHub Star 管理器。它把开发者杂乱无章、随手点下的成百上千个 starred 仓库，重新组织成一个**可检索、可标注、可分类、可洞察**的个人知识星图（"Asterism" = 星群：把零散的星标连成有意义的星座）。

`apps/web` is the primary surface (响应式 Web，MVP 优先端)，覆盖登录、同步、浏览（卡片/列表 + 虚拟滚动）、多维筛选、关键词搜索、标签、集合、笔记、统计仪表盘与导入导出；Phase 2 追加 AI 整理建议（BYOK）和批量整理。success = 用户能在几秒内从上千个 star 里找到/归类想要的仓库，而不是在原生 GitHub star 列表里无限下拉。

## Brand Personality

- **克制、专业、面向开发者**：低调工具感，不靠视觉说服，靠效率说服。
- **秩序感优先于装饰**：信息密度优先，动效克制而不喧宾夺主。
- **星座隐喻**：collections / tags 等概念可呼应"星座"意象，但不能让功能表达含糊——隐喻服务功能，不喧宾夺主。

## Anti-references

- **千篇一律的 SaaS-cream AI 套路**：渐变卡片、hero-metric 模板（大数字+小标签+渐变强调）、统一同尺寸卡片网格、每个 section 头顶小型 uppercase eyebrow、编号 01/02/03 装饰性分区标记。这些是训练数据里最常见的"一眼 AI 做的"信号，Asterism 要避开。
- **臃肿的书签管理器 / 传统后台 CMS 的拥挤感**：不做通用书签工具的视觉语言（大量图标+文字卡片墙），也不做传统企业后台那种密集表格+侧边栏堆砌的沉闷感；参考 GitHub 自身 Primer 设计体系的克制与秩序感。

## Design Principles

1. **工具感而非营销感**：产品服务用户效率，不靠视觉噱头说服；克制优先于炫技。
2. **多端一致的视觉语言**：web / extension / desktop 共享 `packages/ui` 的同一套组件与 tokens，平台差异留在各端壳层。
3. **状态透明**：同步中 / 完成 / 失败等状态要清晰可见，用户始终知道数据处于什么阶段、来自哪里。
4. **隐喻服务功能，不喧宾夺主**："星座"主题词可用但不能让操作路径或信息层级变得含糊。
5. **数据自主与开源优先**：可自部署、数据可导出，视觉与交互不应制造"锁定感"（如隐藏导出入口、模糊数据归属）。

## Accessibility & Inclusion

- **目标 WCAG 2.1 AA**：颜色对比度达 AA、可键盘操作、焦点可见（`--ring`）、合理的语义化标签与 ARIA、虚拟滚动列表的可访问性。
- **明暗模式**：默认跟随系统 + 可显式切换，light / dark 均为一等公民，对比度在两套主题下都需达标。
- 未来动效需提供 `prefers-reduced-motion` 的等效方案（当前项目动效克制，风险较低，但新增动效时须补上）。
