---
target: AI 整理（apps/web ai-organization）
total_score: 29
p0_count: 1
p1_count: 2
timestamp: 2026-07-23T07-23-28Z
slug: apps-web-src-components-ai-organization-tsx
---
# Critique: AI 整理（apps/web）

Method: dual-agent (A: agent-14781edd · B: agent-3157685d)

## Design Health Score — 29/40（Good，发布前需处理弱项）

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 确认后整个批量执行阻塞在对话框 spinner 内，真实进度被隐藏（use-ai-organization.ts:99） |
| 2 | Match System / Real World | 3 | 「添加关系/移除关系」是数据库话术泄漏（zh-CN.json:444-445）；中文界面保留 "Provider"/"Generation Connection" |
| 3 | User Control and Freedom | 3 | 丢弃草稿无确认无撤销；任一单行保存中整个列表被锁（ai-organization.tsx:300） |
| 4 | Consistency and Standards | 3 | en 文案 "..." 与 "…" 混用；「选择」一词同时指仓库选择与审阅选择 |
| 5 | Error Prevention | 3 | 50 上限、preflight、逐项批准都好；但破坏性「丢弃草稿」零防呆（ai-organization.tsx:607） |
| 6 | Recognition Rather Than Recall | 3 | 确认汇总在滚动区底部，批准动作在顶部，需跨屏回忆（ai-organization.tsx:549 vs 398） |
| 7 | Flexibility and Efficiency | 2 | 无「全部批准」、无乐观更新、生成成功后还要再点一次「继续审阅草稿」 |
| 8 | Aesthetic and Minimalist Design | 4 | 信息密度高但每一处都有功能；无装饰性冗余 |
| 9 | Error Recovery | 3 | 错误文案全员注明「什么被保留、如何重试」堪称典范；但审阅错误渲染在长列表底部，可能滚出视野（ai-organization.tsx:586） |
| 10 | Help and Documentation | 2 | noConnection 提示去设置却无跳转链接（ai-organization.tsx:104-108） |

## Anti-Patterns Verdict

**LLM assessment**：不像 AI 生成。全套界面严格遵守 Graphite Glass 契约：无渐变文字、无 emoji、无 uppercase eyebrow、无编号标记、无侧边彩条；圆角最大 8px，蓝色按 Restrained 策略只给 primary/focus。熟悉 Linear/Primer 的用户会信任这个界面。

**Deterministic scan**：detect.mjs 对 ai-organization.tsx / bulk-organization.tsx / browse.tsx 扫描退出码 0，零发现——token 纪律（text-caption、bg-card 等）无硬编码穿透，与 LLM 判断互证。

**Visual overlays**：不可用。dev server 运行于 localhost:5173，但目标界面位于 GitHub OAuth 登录之后且依赖真实用户数据（stars、AI 连接、草稿），无法注入覆盖层。回退信号：代码级评审 + 干净 CLI 扫描。

## Overall Impression

工程素养明显高于界面直觉：持久化草稿、revision 冲突、失败文案的状态保全承诺都是一流后端思维；但「确认 → 执行」的交接、审阅效率、破坏性动作的防呆仍停留在「能跑通」而非「敢托付」。最大机会：把执行进度从对话框 spinner 还给已有的 BulkOperationBanner 管线。

## What's Working

1. **失败文案的状态保全承诺**：每条错误都明确「什么未改变 + 如何重试」（generateError/reviewError/conflict/stale），BYOK 信任范本。
2. **可访问性纪律**：aria-pressed/aria-busy/逐条 aria-label、汇总数字 sr-only 重复、motion-reduce 全部到位；测试覆盖冲突与恢复路径。
3. **preflight 透明度**：逐字段披露发送内容、「绝不发送 README 或 credential」、旧草稿「校验通过后才替换」——高风险时刻的安抚做得很好。

## Priority Issues

- **[P0] 确认把整个批量执行塞进对话框 spinner**：use-ai-organization.ts:94-103 在 mutation 内 runBulkOperationUntilSettled，对话框锁定数十秒、不可关闭、零进度。**Why**：最高风险瞬间剥夺可见性，且架空了 banner 管线的存在意义。**Fix**：mutation 只做确认事务，成功后关对话框，执行进度交给 BulkOperationBanner（已支持断点续跑）。**Command**：$impeccable shape
- **[P1] 丢弃草稿零防呆**：ai-organization.tsx:607-621 单击 destructive 即销毁持久化草稿，可能抹掉几十项审阅劳动。**Fix**：行内两步确认或丢弃后限时撤销。**Command**：$impeccable harden
- **[P1] 单行审阅更新锁定整表 + 无批量批准**：disabled={reviewPending} 锁所有行（ai-organization.tsx:300/435），50 仓库审阅被串行化；低风险「添加」无「全部批准」。**Fix**：乐观更新 + 冲突回滚（服务端 revision 兜底），只禁用 pending 行；加低风险批量批准。**Command**：$impeccable polish
- **[P2] 认知负荷：汇总与操作分离、工具栏拥挤**：确认汇总在滚动区底部、footer 确认按钮不带计数；选择模式工具栏 6 按钮并存。**Fix**：汇总上移或 footer 内嵌计数；工具栏收敛为 1 主 + 1 次 + 菜单。**Command**：$impeccable layout
- **[P2] UX 文案**：「添加关系/移除关系」数据库话术、「取消」三义、Provider 未中文化、noConnection 无设置跳转链接。**Command**：$impeccable clarify

## Persona Red Flags

- **Alex（重度用户）**：1000 star 需 20+ 批，UI 无分批引导；每批内点击被整表锁串行化；确认后还要等全量执行完才能继续。
- **Sam（读屏/键盘）**：BulkOperationBanner 整区 aria-live="polite"（bulk-organization.tsx:217），计数跳动造成播报轰炸；确认/丢弃后 banner 卸载，焦点丢失到 body；BulkOrganizeDialog 百行 Select 无搜索，键盘遍历不可行。
- **Riley（压力测试）**：51 仓库、无连接、冲突、stale 都有明确处理（好）；但 200 标签的批量对话框不可用；手动批量整理有 activeBulkOperation 防护而 AI「确认整理」没有（browse.tsx:446 vs 434），可能并发两个批量操作；all-success 未翻转 completed 的瞬间 banner 出现「需要处理 + 绿勾 + 零按钮」死态（bulk-organization.tsx:231）。

## Minor Observations

- 新建分类信息重复出现两次（顶部审批区 + 每仓库 dependency 行）。
- 最多三条 banner 可堆叠（sync/bulk/AI），无优先级规则。
- 批量对话框确认按钮只带仓库数不带变更条数；tri-state 不显示各目标当前归属（盲操作）。
- hiddenSelectedCount（「3 个已被筛选隐藏」）是出色的透明度细节，值得保留。
- 审阅错误渲染在滚动区底部（ai-organization.tsx:586），应移至 footer 上方常驻区或 toast。
- 生成成功后只出现安静 banner，首次峰值被浪费；应直接打开审阅对话框。

## Questions to Consider

1. 既然批量管线支持断点续跑与重试，为什么确认事务要把整个执行塞进一个 mutation——是不信任自己的 banner，还是不信任用户会看 banner？
2. 如果每条 AI 建议都必须人工逐项批准，AI 相对手动整理省下的到底是什么？
3. 50 上限是产品决定还是 prompt 成本决定？界面是否诚实地承认「你需要分 20 批」？
4. 「丢弃草稿」比「留着以后再说」在视觉上更显眼——是有意引导清理，还是破坏性动作默认暴露过头？
