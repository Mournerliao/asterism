# 2026-08-14 · UI Generation Loop

## Collection Dial 多选投影与状态反馈

- 目标：在不改变 #31 Dial 视觉骨架的前提下，让 Browse Grid / List 只为选中项显示 Grip，并把部分成员数量与
  多选执行状态接入同一受控组件。
- 工具：按项目要求运行 Impeccable context loader 与 detector；复用既有 token、Button、Grip、Dial 与 selection
  toolbar，没有新增样式系统、颜色、依赖或页面级变体。detector 返回零项。
- a11y：Grip 保持 44px；ready / pending / success 使用 polite status，failure 使用 assertive alert；缺失 / 已有、
  成功与失败计数均来自冻结范围并提供 en / zh-CN 文案。
- 真实浏览器：Grid / List 与 390×844 已检查；选中两项后筛选隐藏一项仍保留完整选择提示，移动可见 Grip
  为 44×44。远端协议部署后，以临时 collection 完成 List / Grid 隐藏项多选、部分已有准确计数与普通单项写入，
  最终 6 个成员全部可见，控制台无错误；临时 collection 随后删除并确认恢复 0 collections。
- gates：全仓 lint、typecheck、333 tests 与 build 通过；数据库 pgTAP 仅因本机 Docker daemon 未启动未运行。

没有新增设计决策；More / New / Undo 与真实连续任务验收仍留给 #33 / #34。

## Collection Dial More / New / Undo / durable recovery

- 目标：在 #31/#32 既有 Dial 骨架内补齐 frozen catalog 的 More / New 入口、operation-scoped
  Undo 与 Browse durable ledger 恢复，不改变未确认 pickup 的非持久语义。
- 工具：对 `apps/web` 运行 Impeccable context loader 和 detector；复用现有 Dialog、Sheet、Input、Button、
  CollectionFormDialog 与 Graphite Glass tokens，没有新增 ad-hoc 颜色、间距、字体或依赖。detector 返回零项。
- a11y：More 搜索在 overlay 打开后获得焦点；Escape 先关闭 Dialog / Sheet 并恢复 More / New
  trigger，再次 Escape 才取消 Dial；运行状态使用 status / alert 语义，所有新增文案同步 en / zh-CN。
- 响应式：desktop 使用 Dialog，390×844 使用 bottom Sheet；空 catalog 时 New 成为主路径。
  light / dark 均以真实浏览器检查，控制台无错误；为避免未授权外部写入，未提交创建表单。
- 恢复：不在 pickup 层制造假 Undo；只从持久 operation ledger 恢复 pending / partial / failed / expired，
  并把 add 与对应 undo 收据作为同一组状态展示。

#34 仍负责真实连续桌面 / 移动任务验收与 throwaway prototype 退役。
