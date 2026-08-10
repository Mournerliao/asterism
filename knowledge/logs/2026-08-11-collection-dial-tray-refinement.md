# 2026-08-11 · Collection Dial 半圆托盘 P1 收敛

## 背景

在 2026-08-10 的拟真方向上继续评审后，原型仍有三个优先问题：点击文件夹会立即提交，导致“选择目标”与“确认写入”混在一起；底部文件夹与页面内容的空间层次不清楚；仓库、目标、位置与异步结果分散，任务因果不够明确。本轮按推荐方案优先修复这三个 P1，不扩大到生产数据链路。视觉复核时用户进一步明确：操作层背景应是渐变透明模糊，而不是实体盆体。

## 本轮实现

- 点击文件夹或使用 Q/E 只更新目标；Enter 与明确的 `Add to {{collection}}` 按钮负责提交。直接拖拽到文件夹并松手仍保留一步投放。
- 在盘面上方增加 `仓库 → 集合` 状态行与 `当前位置 / 总数`，集中呈现引导、pending、success 与 failure；补充 Cancel，保留 Retry 与单次 Undo。
- 首次模拟失败后的 Retry 现可成功恢复；Reset 恢复默认 Frontend 目标，`aria-pressed` 与视觉选择同步。
- 半圆感只由文件夹弧形排布形成；底部背景使用从完全透明到半透明的渐变磨砂模糊层，不绘制实体 basin / rim，也不使用大面积 radial glow。
- 移除与文件夹直接选择重复的左右悬浮箭头；Q/E 作为低权重键盘提示并入位置反馈旁。移动端隐藏键盘提示，点击最外侧可见文件夹即可继续推进 3 项窗口。
- 将窗口模型改为始终以当前目标为中心，不再在集合序列两端钳制窗口起点。选中项固定转入弧线中央，其余文件夹按相对距离同步平移、旋转、缩放与深度重排，边缘项模糊淡出；320ms 自然减速负责空间连续性，reduced-motion 下仍立即完成状态切换。
- 文件夹姿态与标签变换解耦，标签始终水平可读；移动端继续显示 3 个集合，宽屏显示 7 个集合。
- 动效收敛到约 220–240ms，并补齐 reduced-motion 下的文件夹 transition 降级。
- 所有新增文案同步 English 与简体中文；仍无硬编码生产文案。

## 真实浏览器验收

- 1536 × 900 的明暗主题下，背景均从透明自然过渡到半透明磨砂，仓库列表可透过但被模糊降噪；无实体盆体或大面积漂浮光晕。
- 390 × 844 显示 3 个集合，标签保持水平可读；1536 × 900 显示 7 个集合。
- 桌面两端不再出现悬浮导航按钮；Q/E 仍可由 `4 / 7` 切换到 `5 / 7`。390 × 844 下直接点击 `Developer experience` 可将窗口推进到 `6 / 7`，无导航能力回退。
- 桌面从 Frontend 切换到 Tooling 时，Tooling 中心坐标由约 1038px 经中间态移动到原 Frontend 的 888px，Frontend 同步退到约 738px；390 × 844 下 Developer experience 由约 319px 移动到 195px 屏幕中心。明暗主题控制台均无 warning / error。
- 点击 Tooling 只改变目标，不触发写入；点击 `Add to Tooling` 后显示 success 与 Undo。
- Q/E 改变目标后按 Enter 成功提交，位置由 `4 / 7` 更新到 `5 / 7`。
- 从 `withastro/astro` 真实拖拽到 `Data & storage` 并松手后一步提交成功。
- `TanStack/query` 首次模拟失败后 Retry 成功恢复；浏览器控制台无 warning / error。

## 工程验证

- 目标文件 `pnpm exec biome check` 通过。
- `pnpm lint` 通过（280 files）。
- `pnpm typecheck` 通过（9 / 9 tasks）。
- `pnpm build` 通过；仅保留契约允许的既有主 chunk warning。
- `pnpm test` 中 core 63、db 31、Supabase Functions 23 与 Web 165 项通过；Web 既有 `embedding-consent.test.tsx` 的「caches the storage lookup across renders」仍失败：`getItem` 期望调用 1 次，实际 0 次。该模块与本轮四个原型 / i18n 文件无依赖，本轮不扩大范围处理。

## 边界与恢复点

本轮仍是 throwaway prototype，只使用内存假数据与模拟写入，不接数据库、embedding 或生产 mutation。尚未完成用户桌面连续 10 个与移动连续 5 个仓库的真实操作 verdict，因此不更新正式 product / UI 契约，也不创建 ADR。下一步以连续任务验证拖拽发现性、Q/E 效率、滚动误触、更多 / 新建承接和 pending / failure / Undo 可理解性。
