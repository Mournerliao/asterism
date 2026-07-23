# 2026-07-23 · GitHub Actions Web 测试环境修复

## 目标

修复 GitHub Actions 从 2026-07-16 起持续失败的问题，让 Web Vitest 在没有本地 `.env`、没有 GitHub Secrets 的干净检出中通过，同时保持生产运行时缺少 Supabase 配置时立即报错。

## 根因

`apps/web` 通过根目录 `.env` 读取 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`。本地开发环境持有这两个值，因此门禁始终通过；GitHub Runner 的干净检出没有 `.env`。

`use-repo-readme.test.ts` 与 `use-ai-organization.test.ts` 测试的是注入 `SupabaseClient` 的纯编排函数，但测试文件导入其 hook 模块时仍会间接加载 Web Supabase 单例。该单例在模块加载阶段校验环境变量并抛错，使 Vitest 在执行任何测试前失败。首次失败 run 为 `b35f785`，之后连续 15 次 CI run 复现同一根因。

最小复现：

```sh
VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= \
  pnpm --filter @asterism/web test -- src/data/use-ai-organization.test.ts
```

## 修复

- Web Vite 配置改用 `vitest/config` 的 `defineConfig`，并注册统一 test setup。
- setup 通过 `vi.stubEnv` 注入 `https://example.invalid` 与 `test-publishable-key`。
- `.invalid` 是保留域名；占位 key 不含凭据。测试无需也不得访问真实 Supabase。
- 不提交 `.env.test`，不配置 GitHub Secrets，不修改 CI workflow，也不放宽 `src/lib/supabase.ts` 的生产运行时校验。

## 验证

- 显式清空两个 Supabase 变量后运行原失败范围：2 files / 6 tests 全部通过。
- 显式清空两个 Supabase 变量后运行完整 Web 测试：32 files / 154 tests 全部通过。
- `pnpm lint`：通过，Biome 检查 289 个文件。
- `pnpm typecheck`：通过，9 个 Turbo tasks。
- `pnpm test`：通过，core 132 + db 54 + functions 94 + web 154，共 434 tests。
- `pnpm build`：通过；仅保留合同允许的既有 Web 主 chunk warning。

测试期间未向测试 Supabase URL 发起请求。Web 测试仍会输出既有的 Happy DOM `github.com/owner/repo` DNS 失败日志，但对应测试通过，且与本次 CI 根因无关。
