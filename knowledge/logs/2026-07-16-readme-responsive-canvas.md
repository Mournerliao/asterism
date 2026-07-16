# 2026-07-16 · README 响应式文档画布（Issue #6）

## 目标

用固定版本、随应用发布的实体文档画布呈现 GitHub README，在 Graphite Glass 明暗主题和窄屏中保留真实结构、技术内容可用性与稳定加载节奏。

## 实现

- 将 README 规则从全局 token 文件迁入 Asterism 原创 MIT `readme-document-v1.css`；canvas 暴露 `data-readme-style-version="1"`，后续升级以新版本文件演进。
- `@asterism/ui` 提供显式 `ReadmeDocument` / `ReadmeDocumentSkeleton` variants，共享 60rem / 960px 实体 card、边框、圆角与响应式 padding，不引入 glass 或 boolean mode props。
- v1 覆盖标题、段落、列表、引用、分隔线、行内/块级代码、宽表、图片、badge、居中 HTML 与 details，并恢复被 Tailwind preflight 改写的 README 图片 inline 语义。
- 大图 `max-width: 100%` + `height: auto` 保持比例；table / pre 各自 `overflow-x: auto`，fragment target 使用 64px scroll margin；summary 与链接均有 focus-visible 反馈。
- loading skeleton 镜像标题、正文、代码与分节并使用同一 canvas；内容就绪后 skeleton 与正文重叠 160ms，分别淡出/淡入完成 crossfade，结束后卸载 skeleton 以免影响短文档高度；`prefers-reduced-motion: reduce` 时直接跳过 outgoing skeleton 与 animation。
- 紧凑 header 延续 return / repository identity / Open on GitHub 三段式；窄屏只隐藏动作文字，保留 44px 图标目标与单行仓库身份。

## TDD 与验证

- 路由测试新增 style version、实体 960px canvas、content crossfade、skeleton 同构、loading status、reduced-motion 与 11 段文档形状断言；定向 README 内容/路由 21 项测试通过。
- Impeccable / Playwright 使用生产 CSS 的 ordinary GFM、HTML-heavy header、badge、超宽 code/table、1600px media 与 details 夹具：1200px light canvas 精确为 960px；390×844 dark 的 viewport / document scroll width 同为 390px，canvas 为 358px。
- 390px 下 pre / table 均只在自身横向滚动；1600px 图片渲染为 316px 且 natural/rendered ratio 均为 2；dark 背景/前景为 `rgb(11, 14, 19)` / `rgb(242, 244, 247)`。
- 正常模式 animation 为 `readme-document-enter`，模拟 reduced motion 后为 `none`；最终浏览器控制台 0 error / 0 warning。
