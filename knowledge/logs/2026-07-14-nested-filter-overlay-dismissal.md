# Nested filter overlay dismissal

## Context

“更多筛选”的 Popover 内嵌 Radix Select。Select 打开时会对外部区域启用 modal pointer-event 隔离，父 Popover 因此无法成为点击目标；用户点击父层表面时，事件实际落到两层之外，导致 Select 与 Popover 同时关闭。

## Changes

- “更多筛选”的 `PopoverContent` 显式使用 `pointer-events-auto`，使其在子 Select 打开期间仍能接收内部点击。
- 未增加受控 open state、全局事件监听或 `preventDefault` 分支，继续沿用 Radix 的原生嵌套浮层关闭语义。
- UI/UX 合约补充父子筛选浮层的 dismissal 规则。

## Verification

- 最小 Playwright 回归先稳定复现父子两层同时消失，再在真实 `RepoFilterBar` 调用点验证修复。
- 点击父 Popover 表面：子 Select 关闭，父 Popover 保持打开。
- 点击父子浮层之外：父子两层均关闭。
- Impeccable detector、lint、typecheck、test 与 build 通过。
