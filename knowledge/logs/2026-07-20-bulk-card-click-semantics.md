# Bulk card click semantics

## 症状

Browse 卡片进入批量选择模式后，点击描述没有切换选择，且已有 Quick Look 可能继续留在界面；项目名同时被错误降为不可点击文本。

## 根因

- `TruncatedDescription` 始终使用 `pointer-events-auto`，但批量模式把其 `onSelect` 置空，导致描述成为会吞掉点击的无动作命中层，底部整卡选择按钮无法收到该点击。
- 进入批量模式只更新本地 mode state，没有请求关闭已有 Repo Inspector。
- `RepoCard` 的批量渲染分支把完整仓库身份输出为 `span`，没有保留 GitHub 外链。

## 修复

- 批量模式下，描述点击直接调用当前卡片的 `bulkSelection.onToggle`。
- 进入批量模式前调用 Repo Inspector 的 `requestClose`；未保存笔记仍沿用既有确认与恢复流程。
- 批量模式仅把项目名渲染为安全新标签页 GitHub 链接；owner、语言点及卡片其他区域继续属于选择路径。

## 验证

- 新增真实 `RepoCard` DOM 回归测试，断言描述点击只切换选择、不调用 Quick Look，并断言项目名是唯一 GitHub 链接且点击不会切换选择。
- 定向测试先红后绿并复跑通过；Impeccable detector 零命中，`pnpm lint`、`pnpm typecheck`、`pnpm test`（Web 128 tests）与 `pnpm build` 全部通过。构建保留既有主 chunk 大小提示，本次未调整阈值或拆包。
