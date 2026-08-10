# 2026-08-10 · Collection Dial 拟真实体原型

## 背景

用户否决 2026-08-06 原型的视觉方向。问题不在弧线曲率，而在原型仍像普通卡片与状态面板，缺少集合是一个可被打开、接住仓库的实体容器这一核心反馈。用户提供草图，明确要求底部半圆轨道、多个沿弧线排布的集合，以及仓库靠近目标时的打开动画。

## 本轮实现

- 移除 A/B/C 变体比较器，开发入口收敛为 `/?prototype=collection-dial`；旧 `variant` 查询参数保留兼容但不再改变表现。
- 将底部选择器重构为半圆实体托盘，五个集合以有背板、纸张、内部暗部和可翻转前片的文件夹呈现。
- 仓库拖动超过 7px 阈值后出现随指针移动的实体浮层；目标文件夹在命中时抬升、张开并露出内容层，离开后合拢。
- 松手投放时，仓库浮层缩小并飞入文件夹，目标嘴部同步扩张；模拟写入完成后继续提供 success / failure / retry / 单次 Undo。
- window 级 pointerup 负责拖拽收尾，避免快速移动或跨元素释放后残留浮层。
- 桌面保留明显半圆纵深；390px 下缩短垂直落差并重新分布五个文件夹，保证全部可见且不与 Q/E 控件重叠。
- 第二轮视觉复核移除半圆容器的可见边框、弧线与硬表面，改为由列表向底部自然加深的渐变、局部背景模糊、中心柔光和地面阴影建立操作区域；半圆只存在于文件夹的空间排布中。
- 非激活文件夹由统一高饱和蓝收敛为石墨中性实体，当前张开目标才进入品牌蓝，降低五个并列对象的视觉噪声。
- 第三轮按 Impeccable `distill` 移除 `Drop here` 与可见关闭按钮：拖拽松手本身即提交；点选仓库后点击文件夹提供触控等价路径；键盘以 Q/E + Enter 提交、Escape 取消。失败后的 Retry 仍保留，因为它承担无法由手势替代的恢复职责。
- 第四轮继续移除盘面上方可见的仓库名与操作提示，并将文件夹整体上移填补空白；状态信息仅保留为 ARIA live 播报，不牺牲辅助技术反馈。
- 第五轮按 Impeccable v4 `adapt` 将固定五项改为基于集合盘实际容器宽度的奇数可见窗口：`≥1120px` 显示 7 项、`560–1119px` 显示 5 项、`<560px` 显示 3 项。所有集合保持挂载，窗口变化与 Q/E 越过边缘时通过位置 / 透明度过渡进出；当前目标始终处于可见范围，隐藏项移出 pointer 与辅助技术交互。
- 所有新增提示同步 en / zh-CN；键盘 Q/E、Enter、Escape、可见焦点、ARIA status 与 reduced-motion 降级保留。

## 验证

- `pnpm exec biome check` 通过。
- 仓库级 `pnpm lint`、`pnpm typecheck` 与 `pnpm build` 通过；build 只有契约允许的既有主 chunk warning。
- 真实浏览器验证 1536 × 900 显示 7 项、1024 × 800 显示 5 项、390 × 844 显示 3 项；手机连续 Q/E 后窗口从 `UI systems / Frontend / Tooling` 跟随到 `Tooling / Developer experience / Data & storage`。明暗主题、无框渐变背景、文件夹张开、模拟投放成功与 Undo 保持；控制台无 warning / error。
- `pnpm test` 的 core 63、db 31、Supabase Functions 23 与 Web 165 项通过；Web 既有 `embedding-consent.test.tsx` 中「caches the storage lookup across renders」单测仍失败，隔离重跑同样得到 `getItem` 期望 1 次、实际 0 次。失败模块与本轮文件无依赖，本轮未扩大范围修复。

## 边界

本轮仍是 throwaway prototype，使用内存假数据与模拟写入，不接数据库、embedding 或生产 mutation。用户尚未完成桌面连续 10 个与移动连续 5 个仓库的真实操作 verdict，因此不更新正式产品 / UI 契约，也不创建 ADR。
