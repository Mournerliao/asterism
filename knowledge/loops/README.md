# Loops · Asterism 的可复用 Agent 循环

本目录定义 Asterism 项目中可复用的 **loop（循环）**。它是 Loop Engineering 工作方式的核心 artifact：把"做一类事"的流程显式化为带有目标、验证门与护栏的循环定义，供任意 agent（Cursor / Claude Code / Codex 等）按图执行。

## 什么是一个 "loop"

在本项目里，一个 loop 是一份 markdown 定义，描述如何**迭代地**完成某类任务，直到满足**可验证的完成条件**才停止。它至少回答：

- **Goal**：要达成什么？以可验证的完成条件表述（不是模糊的"做好 X"）。
- **Inputs/Context**：执行前要读哪些契约（`knowledge/contracts/`）与持久状态（`knowledge/state/`）。
- **Steps**：每轮迭代要做的具体动作。
- **Verification**：用什么 gate 判定"完成/通过"——测试、lint、typecheck、契约验收等。
- **Guardrails**：边界与安全护栏——文件认领范围、迭代上限、预算、禁密钥、沙箱约束。
- **Stop condition**：何时停止（成功收敛 / 触发上限 / 阻塞需上报）。
- **Logging**：每轮要往 `knowledge/logs/` 追加什么（目标/迭代次数/验证结果/成本）。

## 为什么要用 loop（动机）

- **可持久（durable）**：流程沉淀为知识，不随单次会话蒸发；换工具/换人/换会话都能复用同一套循环。
- **可验证（verifiable）**：以契约和自动化门（tests/lint/typecheck）判定完成，避免"看起来对"的漂移。
- **可复利（compounding）**：每轮把进度写回 `state/`、把运行写进 `logs/`、把决策沉进 `decisions/`，下一轮从已有成果继续，进度像复利一样累积，而不是每次从零开始。

## 如何使用模板

1. 复制 `_template.loop.md` 为 `your-task.loop.md`（命名用小写连字符 + `.loop.md` 后缀）。
2. 逐节填写：把 **Goal** 写成可机检/可人工验收的完成条件；在 **Inputs/Context** 列出要读的契约与状态文件；明确 **Verification** 的 gate 命令/标准。
3. 设定 **Guardrails**：声明本次会改哪些文件（file-claims）、迭代上限、是否需要联网/安装、禁止提交密钥等。
4. 执行并在每轮结束按 **Logging** 往 `knowledge/logs/<date>-<slug>.md` 追加记录；收敛后更新 `knowledge/state/PROGRESS.md`。
5. 若执行中发现循环本身有缺陷，回头改进这份 loop 定义（循环也是被迭代的对象）。

## 可用 loops 索引（Index）

| Loop | 文件 | 用途 |
| --- | --- | --- |
| 模板 | [`_template.loop.md`](./_template.loop.md) | 新建 loop 的基线模板，定义统一结构 |
| UI 生成 | [`ui-generation.loop.md`](./ui-generation.loop.md) | 用 v0 / shadcn MCP 生成 UI，对齐 `contracts/ui-ux.md`，落地到 `packages/ui` 并做 a11y/lint 验收 |

> 新增 loop 后请在上表登记，保持索引与目录同步。
