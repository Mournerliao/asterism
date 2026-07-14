# Browse Filter Hierarchy and Facet Performance · 2026-07-14

## 问题

Browse 将语言、Topic、标签、Star、更新时间、状态与排序平铺为 7 个同级控制，桌面控制条过长，窄屏更易产生无意义换行。Topic 使用 Radix Select 一次挂载全部唯一 topic；在数百个仓库的真实数据下，弹层接近整页高度，首开同步承担大量 item 注册、布局测量与定位，产生可感知卡顿。

## 实现

- 主栏收敛为语言、Topic、标签、更多筛选与排序；Star 阈值、更新时间、仓库状态进入“更多筛选”弹层，并用 badge 显示已启用数量。
- 语言与 Topic 改为可搜索 `FacetPicker`：默认窗口 20 项，搜索从完整集合匹配后最多展示 50 项；当前选中项不在默认窗口时置顶保留。
- Topic 继续使用 core 已有的频率顺序，语言继续按字母排序；筛选语义与 Zustand 状态模型不变。
- `packages/ui` 新增薄 `Popover` 原语，业务搜索、窗口策略和筛选组合留在 Web 组件，未新增依赖。
- 清除筛选收敛为带外部化 aria-label / title 的图标按钮；新增 en / zh-CN 搜索、空结果、窗口提示与“更多筛选”文案。
- 根据真实 Light Mode 与 DevTools 计算样式复核，确认真正原因是放大镜先于 Input 绘制，被 Input 的半透明 Glass 背景覆盖洗白。三处实现最终收敛为共享 `SearchInputIcon`：统一 `black/60`、标准 Lucide 描边与 `z-10` 前景层级，只由调用方提供水平位置。
- 移除 FacetPicker / Button 上额外的 `h-7` 覆盖，全部筛选 trigger 统一复用 `size="sm"` 的 32px 高度，与排序 Select 对齐。

## 性能边界

- Topic 首开从“全部唯一 topic”降为固定 20 行 DOM，弹层高度固定为 256px 可滚动区。
- 搜索输入使用 deferred query，结果窗口上限 50；不因数据集增长而线性扩大弹层 DOM 和首开布局成本。
- Stars、更新时间、状态与排序仍使用小规模 Select；标签保留多选 DropdownMenu，均不属于高基数 GitHub facet。

## 验证

- `getVisibleFacetOptions` 4 项单测通过：默认窗口、选中项保留、大小写不敏感全量搜索、空结果。
- Impeccable detector 对本次 3 个 UI 目标文件返回 0 findings。
- `@asterism/ui` 与 `@asterism/web` typecheck、全仓 lint 通过。
- Playwright CLI 启动与 snapshot 未返回可用会话输出，因此本轮没有声称完成可视化浏览器验收；以固定 DOM 上限、类型检查和单测作为当前回归信号。

## 决策

本次只调整既有 Browse 控制层级和客户端呈现策略，不改变领域筛选语义、数据库或架构边界，无需新增 ADR。
