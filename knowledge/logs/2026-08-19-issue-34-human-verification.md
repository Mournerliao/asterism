# 2026-08-19 · #34 剩余关单改为维护者验收

## 结论

#34 看起来难，是因为原 AC 把「agent 在真实浏览器里测完每一条旅程并留下证据」当成关单条件，而不是因为还缺产品功能。#30–#33 已实现 Collection Dial；#34 已修 Undo apply、退役 prototype、迁许可 SVG。

维护者明确：不需要 agent 再验证，功能做完后由维护者自己验收。GitHub #34 改为 `ready-for-human`；剩余 checkbox 是维护者旅程清单，发现缺陷再开 fix，不要把实测重新指派给 agent。

## 文档

- issue 正文与标签已改
- `PROGRESS` / `NOTES` / `BACKLOG` / `roadmap` / `supabase/README` 与 #34 日志已去掉「agent 必须补测才能关单」
