# 2026-07-26 · 修复智能搜索恒为 degraded（WASM 变体缺失 + 远端缺表）

## 现象

设备满足要求（WebGPU 可用、资产齐全），但 Browse 恒显示「此设备尚未准备好智能
搜索」（`degraded`），重试无效。

## 根因（两个独立问题叠加）

1. **ONNX WASM 变体缺失**：`onnxruntime-web` 1.26-dev 按执行后端拆分 wasm 构建
   （普通版 / `jsep` / `jspi` / `asyncify`），WebGPU 后端必须用带 `webgpuInit` /
   `jsepInit` 的变体。worker 把 `wasmPaths` 钉死在普通版单文件上，WebGPU 初始化抛
   `TypeError: webgpuInit is not a function`，连带 WASM 回退同错，prepare 必败。
2. **远端数据库缺表**：Supabase 远端项目未应用 `20260724120000` /
   `20260724130000` / `20260725120000` 三个迁移，`user_repo_embeddings` 查询 404，
   bootstrap 一查库即抛错进入 `degraded`。

## 修复

- `apps/web/scripts/prepare-embedding-assets.mjs`：从枚举两个文件改为整组拷贝
  `ort-wasm-simd-threaded*.{mjs,wasm}` 全部变体。
- `apps/web/src/workers/embedding.worker.ts`：`wasmPaths` 从单文件对象改为目录
  前缀；用同源绝对 URL 而非根相对路径，绕开 Vite dev 对根相对动态 import 注入
  `?import` 后被 public 目录规则拒绝（500）的问题。
- 环境操作（非代码）：以工作区 devDependency 安装 `supabase` CLI，`link` 后
  `db push` 补齐三个迁移，本地/远端迁移清单已对齐。

## 验证

- worker 隔离复现：`prepared backend=webgpu`，嵌入输出 384 维，约 5s。
- 真实登录态全流程：514 仓库回填至 100%（WEBGPU），横幅消失（ready）；
  搜索框输入中文查询出现「Related by meaning」语义结果区。

## 边界说明

- 语义结果的排序质量（如描述含「下载工具」的仓库未排前列）属混合排序调优，
  另行处理，不在本次修复范围。
- 迁移推送属环境操作，不产生迁移文件变更。
