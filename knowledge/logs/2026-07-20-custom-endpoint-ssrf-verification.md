# 2026-07-20 · 自定义 endpoint SSRF 边界验证与裁决

## 背景

Phase 2 的类型化 Generation Provider Registry（ADR 0018）允许具名自定义 OpenAI-compatible Connection。`contracts/conventions.md` 的「AI Provider 网络边界」要求保存、能力测试与调用时阻断 localhost / 私网 / 链路本地 / 保留 / 云 metadata，并对 DNS 解析结果与每次重定向重新校验。BACKLOG「Phase 2 技术验证 — 自定义 endpoint 安全」要求在实现前确认这些拦截在目标 Supabase Edge Runtime 中可可靠实现，否则自定义 Connection 必须收敛为部署者 allowlist。本次以一次性原型完成两层验证并裁决。

## 第一层（纯逻辑，本地验证）

- 运行时无关的 IP 分类器覆盖 IPv4 / IPv6 的 loopback、私网（RFC1918）、CGNAT（`100.64/10`）、链路本地、唯一本地（`fc00::/7`）、保留、文档、广播、组播与云 metadata（`169.254.169.254`、`169.254.170.2`）。
- 借 WHATWG `URL` 归一化把十进制（`2130706433`）、十六进制（`0x7f000001`）、八进制（`0177.0.0.1`）编码主机名收敛为点分十进制后再判定；IPv4-mapped IPv6（`::ffff:127.0.0.1`）提取内嵌 v4 重分类。
- 对每个 DNS 解析结果逐一分类，任一命中即整体拒绝；空解析视为不安全。
- `fetch(redirect:'manual')` 逐跳返回 3xx + Location 而不自动跟随，逐跳重新解析与校验，限定最大跳数。
- 以上均在本地（Node type-stripping）验证通过；直连 metadata 在建立连接前即被拦截；本地一次性 http server 确认 `302 + Location` 被交回而非自动跟随。

## 第二层（托管 Supabase Edge Runtime 实测）

向项目 `hqtrmulypxwdqvzlkhke` 部署一次性探针函数 `ssrf-layer2-probe`（`--no-verify-jwt`），单次调用后删除。结果：

- 运行时 `supabase-edge-runtime-1.74.2`（兼容 Deno v2.1.4）。
- `Deno.resolveDns` 可用：成功解析 `example.com`（公网）与 `localtest.me`（→ `127.0.0.1`），证明服务端「先解析再校验」可落地。
- 出站：`169.254.169.254` 直接连接失败（os error 22）、`169.254.170.2` 命中 Deno net 权限（NotCapable），即云 metadata 已被平台挡；但 `127.0.0.1` 连接被拒绝、`10.0.0.1` 超时，说明 loopback 与私网出站会真实发起，平台不是充分兜底。

## 裁决（ADR 0024）

- 分类器守卫在保存 / 测试 / 调用时恒开，不得把未校验用户 URL 直接作为请求目标。
- 因任一实例（含维护者部署到 Vercel 后分享给他人）只要有第二个不完全可信用户即为托管多租户，自定义 endpoint 在守卫之上叠加部署者域名 allowlist；内置 Provider 域名固定免配，个人实例可 allow-all，公开分享实例应 curate 或关闭自定义 endpoint。
- HTTPS 下 DNS-rebinding 的 TOCTOU 为已知残余限制（标准 `fetch` 无法钉死已校验 IP），字面量 IP 无此窗口且 allowlist 生效时规避，云 metadata 已被平台挡，残余价值极低。

## 清理与产物

- 一次性探针函数已从项目删除（现只剩 `sync-stars` / `read-repo-readme`），本地文件已删。
- 本地原型 `supabase/functions/_ssrf-guard-prototype/`（含纯分类器 `ssrf-guard.ts`）验证后已删除，答案固化进 ADR 0024，实现时按合同重建分类器即可；同时回滚了原型专用的 biome ignore、supabase tsconfig exclude 与 `prototype:ssrf` 脚本。
- 同步更新：`contracts/conventions.md`（AI Provider 网络边界补 allowlist 与残余）、`state/BACKLOG.md`（技术验证项关闭）、`state/PROGRESS.md`、`state/NOTES.md`、本 ADR 0024。
