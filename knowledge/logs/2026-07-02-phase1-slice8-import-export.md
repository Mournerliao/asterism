# 2026-07-02 · Phase 1 Slice 8：导入 / 导出

## 目标

对齐 Ardot `12:182`，支持 JSON / CSV / Markdown 导出与 JSON 导入组织数据。

## 变更

- **packages/core**：`data-port/` — v1 schema、`buildExportPayload`、`serializeExportJson/Csv/Markdown`、`parseImportJson`、`normalizeImportData`；Vitest round-trip。
- **packages/db**：`listNotes` 读查询；`importUserData` 按 tags → collections → 关联 → notes 顺序写入，fullName 匹配已 star 仓库，冲突 skip。
- **apps/web**：`ImportExportPage` 双栏（格式切换 + 下载 / 拖拽上传 JSON）+ 预览 `<pre>`；`useImportUserData` + Query invalidate。

## 设计决策

- 导入**不创建 repos**（须先 Sync）；导出用 `fullName` / `tagName` / `collectionName` 作跨实例稳定引用。
- Markdown 导出按契约补全（设计原型仅 JSON+CSV）。

## 验证

- `pnpm test` / `lint` / `typecheck` / `build` 全绿
