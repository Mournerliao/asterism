# 简体中文混排可读性规范化

- 日期：2026-07-20
- 目标：全面检查 Web 简体中文界面的中英文混排边界，修复遗漏并建立可持续的回归门禁。

## 检查与取舍

- 按 Impeccable `typeset` 流程并行完成主观排版审视与机械预扫描；初次与修改后的 `detect --scope type` 均返回 `[]`。
- 静态 zh-CN 资源原本大多已正确留白；明确遗漏位于 `browse.starred` 的插值边界，另有 `star` / `Star` / `Stars` 大小写不一致。
- 采用受控规则：自然语言中的汉字与拉丁术语、缩写或拉丁插值之间保留一个半角空格；禁止对仓库名、`owner/name`、URL、文件名、代码、版本号或 README 原文做全局自动改写。
- 阿拉伯数字与中文量词 / 单位继续遵循 `Intl` locale 原生输出，例如 `2周前`、`1.2万`；本轮不把中英文留白扩大成有争议的中数规则。
- 扫描同时发现既有字号 utility 与定稿语义 token 存在偏差，但它不影响本次混排边界，未扩大修改范围。

## 落地

- 统一 zh-CN 的 `Star` / `GitHub Stars` 写法，并将动态收藏时间改为“收藏于 {{time}}”。
- 将语言切换短标签与设置页语言名称接入 en / zh-CN 翻译资源，清除生产组件中的硬编码中文。
- locale 切换时同步 `<html lang>`，确保浏览器与辅助技术获得正确语言语义。
- 新增全量 zh-CN 资源测试，检测汉字与拉丁字符 / 插值的粘连，并保护 `Star` 术语大小写。
- 同步 `knowledge/contracts/conventions.md`、`knowledge/contracts/ui-ux.md` 与 `apps/web/DESIGN.md`。

## 验证

- Impeccable typography detector：0 findings（修改前 / 后）。
- `pnpm lint`：通过。
- `pnpm typecheck`：通过。
- `pnpm test`：通过；Web 26 files / 130 tests。
- `pnpm build`：通过；保留既有 Vite chunk size warning，没有抬高阈值掩盖。
- 视觉复核：本轮不改变字号、颜色、间距或布局；明暗模式与响应式呈现不受影响。
