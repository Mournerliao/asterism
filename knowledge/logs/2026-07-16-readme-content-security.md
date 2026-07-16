# 2026-07-16 · README 内容安全与链接边界（Issue #5）

## 目标

在保留真实 GitHub README 阅读结构的同时，把仓库控制的 HTML 限制在不可执行、不可覆盖 App Shell 的边界内，并明确 fragment、仓库路径与离站链接的导航语义。

## 实现

- DOMPurify 之后继续遍历清洗结果，只保留显式 tag / attribute allowlist；脚本、表单控件、SVG / MathML、iframe / object / embed、音视频与其他主动内容均被移除。
- class 不再原样信任，只保留 `language-*`、`highlight*`、`pl-*` 与 `markdown-alert*` 等 GitHub 代码/文档结构子集，阻止仓库借用应用现有 Tailwind utility class 覆盖界面。
- fragment 链接移除仓库提供的 target / rel，并通过 React Router 在当前 README 路由原位更新 hash；匹配目标获得程序化焦点并滚入视口，键盘激活仍沿用原生 anchor click 语义。
- 仓库相对文件与 Markdown 转到 GitHub `blob/HEAD`，以 `/` 结尾的目录转到 `tree/HEAD`；GitHub root path、HTTP(S)、protocol-relative 与 mailto 离站链接统一使用 `_blank` + `noreferrer noopener`。
- 相对图片转到 `raw.githubusercontent.com` 并 lazy load；root-relative 图片、危险 scheme、畸形 URL 与不支持 rich construct 移除主动属性或结构，正文继续渲染。

## TDD 与验证

- 红灯首先复现目录链接被误判为 `blob`、fragment 点击未更新 Router hash；随后补充 presentation injection 与 fragment rel 污染的失败用例。
- 安全测试覆盖脚本、事件属性、表单、embed、SVG、危险 scheme 与 utility class；兼容测试覆盖标题、段落、列表、引用、表格、代码、badge、居中 HTML 与 details。
- URL 分类逐类断言 fragment、相对文件、目录、root path、外部 HTTP(S)、protocol-relative、mailto、畸形 URL 及相对/protocol-relative/root-relative 图片，并对每个离站链接验证 target / rel；畸形 protocol-relative 图片必须移除 `src`。
- 定向 19 项测试、Web strict typecheck 与 Biome 通过；完整仓库 lint、8 workspace typecheck、109 项测试与生产构建通过。
- Impeccable / Playwright 以生产 CSS 验证真实 README 结构夹具：desktop light 与 390×844 light/dark 的文档层级、表格、长代码、链接和 details 正常；移动视口 `documentScrollWidth = viewport = 390`，长代码只在自身容器横向滚动，深色背景/前景为 `rgb(11, 14, 19)` / `rgb(242, 244, 247)`。
