# Repo Table 与 Inspector 字体层级修正

日期：2026-07-15

## 问题

Repo Table 的两行 Activity 与 Inspector 的语言、Stars、Forks、Updated 同处 12px 声区，次级信息形成过大的视觉块；Peek 面板内 22px/Bold 仓库名又接近页面标题，导致身份、正文与元数据竞争。组件中还存在 `text-[13px]` / `text-[11px]` 字面量，虽数值落在既有 ramp，却绕过语义 token。

## 修正

- 保留 Geist Variable + Geist Mono Variable，不引入新字体。
- 明确连续的 13 / 12 / 11px 三层：仓库身份与正文、常规元数据、Activity/紧凑元数据。
- Inspector 仓库名收敛为 18px/SemiBold，分区标题改为 12px/SemiBold。
- Table Activity 与表头使用 11px micro；owner 与描述改为 caption，repo name 保持 body/SemiBold。
- 数字与日期值使用 Geist Mono + `tabular-nums`，自然语言标签继续使用 Geist Sans。
- 为 body/caption/micro token 补齐 20/16/14px 语义行高，移除目标组件中的任意 px 字号。
- Overview 描述限制为 70ch，避免 Focus 模式行长失控。
- 修复共享 `cn()` 的根因：`tailwind-merge` 未识别项目自定义字号名，会把 `text-metadata text-muted-foreground` 误判为两个文字颜色并删除字号类，导致 Activity 实际继承为 16px/24px。现已扩展 text theme 识别全部语义字号，并新增回归测试。

## 验证

- Impeccable `typeset` 使用两份隔离审查：视觉字体评估 + type detector 机械扫描。
- type detector 修正前后均为 0 findings；机械 grep 的 9 个 arbitrary 字号命中已归零。
- 修复合并根因后重新校准，用户 Chrome 实测 Activity 与 Inspector metadata 的最终 computed style 均为 11px/14px，DOM 同时保留字号与颜色 class。
- Web typecheck 与 27 个测试通过；全仓 lint / typecheck / test / build 通过。
