# AI 整理能力 · UI/UX 评审与修复

日期：2026-07-23

## 范围

对已完成的「AI 整理」（`apps/web` ai-organization）纵向切片做 UI/UX 评审（impeccable 双 agent
critique），并落地评审提出的全部 5 个优先问题。评审快照：
`.impeccable/critique/2026-07-23T07-23-28Z__apps-web-src-components-ai-organization-tsx.md`
（Design Health 29/40，P0×1 / P1×2 / P2×2）。

## 修复

- **P0 · 确认与执行解耦**：`useConfirmAiOrganizationDraft` 不再内联
  `runBulkOperationUntilSettled`；确认事务成功后关闭对话框、清空草稿缓存，执行进度交还
  `BulkOperationBanner`（`confirmAndStartAiExecution` 拉取 operation 后由横幅驱动）。见 ADR 0025。
- **P1 · 丢弃草稿防呆**：`AiOrganizationDraftDialog` 的丢弃改为行内两步确认（首次点击进入
  armed 态、按钮变 destructive + 「再次点击确认丢弃」；5s 超时或失焦自动复原）。
- **P1 · 审阅乐观更新 + 全部批准**：`useUpdateAiOrganizationDraftReview` 改乐观更新
  （onMutate 快照 + setQueryData，失败回滚，冲突 invalidate 重取），scope 串行、revision 执行
  时读缓存；行按钮只禁用当前 pending 行，不再整表锁定。新建分类区新增「全部批准」（>1 个待
  批准时出现，串行提交）。onUpdate 签名收敛为只收 `change`。
- **P2 · 布局与认知负荷**：确认按钮携带改动总数 `Confirm (N)`；reviewError/confirmationError/
  discardFailed 移出滚动区、固定在 footer 上方；选择模式工具栏低频动作收入 DropdownMenu 溢出
  菜单。
- **P2 · 文案去数据库话术**：zh「添加关系/移除关系」→「新增归类/移除归类」；「Provider」→
  「供应商」、「Generation Connection」→「生成连接」、「credential」→「密钥」；preflight 无连
  接时新增「前往设置」入口（`/settings`）。en 同步小写 provider。

## 验证

- `apps/web` 全量测试 155 passed（新增 approveAll 测试、丢弃两步确认与 onUpdate 新签名断言、
  确认解耦断言）。
- `tsc --noEmit` 通过；Biome check 通过（含 i18n 两语言与格式化）。

## 后续

- 评审剩余次要项（banner 堆叠优先级、批量对话框大列表搜索、all-success 瞬间死态）未处理，
  记入 BACKLOG 视需要跟进。
