# 0024 · 自定义 endpoint SSRF 边界与部署者 allowlist

- Status: Accepted
- Date: 2026-07-20

> 落实 `contracts/conventions.md` 的「AI Provider 网络边界」，关闭 BACKLOG「Phase 2 技术验证 — 自定义 endpoint 安全」。承接 ADR 0017（BYOK 加密）与 0018（Provider Registry）。

Phase 2 实现前，对自定义 OpenAI-compatible endpoint 的 SSRF 防护做了两层验证。第一层为纯逻辑：以运行时无关的 IP 分类器覆盖 IPv4 / IPv6 的 loopback、私网（RFC1918）、CGNAT、链路本地、唯一本地、保留、文档、广播、组播与云 metadata（`169.254.169.254`、`169.254.170.2`），借 WHATWG `URL` 归一化把十进制 / 十六进制 / 八进制编码主机名收敛为点分十进制再判定，对每个 DNS 解析结果逐一分类、任一命中即拒绝，并以 `fetch(redirect:'manual')` 逐跳重新解析与校验、限定最大跳数。全部在本地验证通过。

第二层为托管环境实测：向目标 Supabase Edge Runtime（`supabase-edge-runtime`，兼容 Deno v2.1.4）部署一次性探针函数，单次调用后删除。结论是——`Deno.resolveDns` 可用，服务端「先解析再校验」可落地；平台已挡云 metadata（`169.254.169.254` 直接连接失败、`169.254.170.2` 命中 Deno net 权限），但 loopback（`127.0.0.1`）与私网（`10.0.0.1`）的出站连接会真实发起（连接拒绝 / 超时，而非平台拦截）。即平台不是充分兜底，Asterism 必须自带分类器守卫。

据此裁决：分类器守卫在保存、能力测试与实际调用时恒开，落地即 conventions 的 AI Provider 网络边界，不得把未经校验的用户 URL 直接作为请求目标。又因任一实例（含维护者部署到 Vercel 后分享给他人的公开实例）只要有第二个不完全可信的登录用户即构成托管多租户，自定义 endpoint 在守卫之上叠加部署者配置的域名 allowlist：内置 Provider（OpenAI / Gemini / Anthropic / OpenRouter）域名固定、视为天然白名单免配；自定义 Connection 只能命中部署者显式允许的域名，个人实例可配置 allow-all，公开分享的实例应 curate 允许域名或关闭自定义 endpoint。

代价与残余：标准 `fetch` 无法把连接钉死到已校验 IP，HTTPS 下的 DNS-rebinding TOCTOU（校验时返公网、连接时返内网）为已知残余限制；字面量 IP 无此窗口，且在 allowlist 生效时被彻底规避，加之最高价值目标云 metadata 已被平台挡，残余价值极低。部署者需维护 allowlist、公开分享时自定义 endpoint 能力受限；换来的是多租户下满足 SSRF 合同，同时不牺牲内置 Provider 与个人自定义 endpoint 的可用性，也无需把自定义 Connection 整体降级删除。
