# 2026-08-06 · 验证本地 Supabase CLI

## 背景

AI Organization 退役验收曾把本机状态记录为“未安装 Supabase CLI”。复核发现仓库根目录已经通过 devDependency 锁定并安装 Supabase CLI，只是它不是全局命令。

## 执行与结果

- 使用仓库约定的 `pnpm exec supabase --version` 验证本地 CLI，版本为 `2.109.1`。
- 未安装额外的全局 CLI，避免与仓库锁定版本漂移。
- `package.json` 与 lockfile 无需修改。
- 本机仍无 Docker 命令，因此尚不能启动 Supabase 本地数据库，也未执行 `20260805120000_remove_ai_organization.sql` 的本地 migration smoke。
