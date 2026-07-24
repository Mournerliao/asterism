> 先读：ADR 0026 §7「地基（不可谈判）」；`knowledge/contracts/ui-ux.md` 的 Browse Search（隐形混合搜索）条目；`knowledge/contracts/product.md` 搜索能力条目。

## What to build

Browse 的单一搜索框把关键词精确命中与语义近邻融合为**一套排序、零模式开关**：打字实时重排，语义近邻在 hairline 分隔线下浮入。查询文本**只在浏览器内**嵌成向量，仅**向量**发到用户自有 Postgres 做距离检索，原文不出设备；模型未就绪时降级为纯关键词。这是检索优先的**首个大用户可见收益**。

## Acceptance criteria

- [ ] 单框、**无「Semantic 模式」开关**；关键词命中与向量近邻融合为单一排序结果。
- [ ] 查询向量在本地生成，仅向量经 RLS-safe 路径（如 security-invoker RPC）发到用户自有 Postgres 做 `order by embedding <=> $q` 距离检索（`where user_id = auth.uid()`）。
- [ ] 结果落在**现有 Browse 列表 / 卡片画布**，打字实时重排，语义近邻按 `--ease-out-quart`（120–240ms）浮入并遵循 reduced-motion。
- [ ] 模型未就绪 / 弱设备降级为纯关键词排序，与上一票降级一致，不阻断。
- [ ] 原文 / 笔记不发往任何第三方；仅向量进入用户自有后端。
- [ ] en / zh-CN、键盘与 a11y 语义；`pnpm lint / typecheck / test / build` 全绿；更新 `knowledge/state/*` 与 `logs/`。

## Blocked by

- #19 — 浏览器内 embedding 运行时与全库回填（需库内已有向量、且能本地嵌入查询）。
