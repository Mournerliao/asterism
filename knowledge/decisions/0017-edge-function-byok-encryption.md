# 0017 · BYOK 由 Edge Function 持久化加密

- Status: Accepted
- Date: 2026-07-18

用户 AI Provider credential 只在保存请求和受信 Edge Function 的内存中以明文存在；它是由对应 Provider Adapter 验证的类型化 payload，不假定只有一个 API key 字段。Edge Function 使用独立服务端 master key 做 authenticated encryption，Postgres 分字段保存 ciphertext、nonce 与加密版本，并可保存不敏感的提示。客户端读取设置时永远拿不到完整 credential，日志、错误、query key 与分析数据也不得包含明文；用户可测试、启用/停用、替换和删除凭据。自部署者必须配置独立加密 secret，Phase 2 同时定义 master key 轮换流程，避免不可迁移的单版本密文。
