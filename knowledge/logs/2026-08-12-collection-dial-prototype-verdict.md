# 2026-08-12 · Collection Dial 原型 verdict

## 结论

用户确认经过 2026-08-06 至 2026-08-12 多轮打磨后的 Collection Dial 可以推荐到真实实现。原型阶段在此结束，不再继续围绕文件夹造型、半圆轨道或底部操作层做无规格约束的视觉精修；下一阶段是 buildable spec。

接受的体验骨架为：Browse 中临时出现的底部半圆集合盘；文件夹作为能张开接收仓库的集合容器；active 目标居中；透明渐变模糊而非实体盆体；点击 / Q/E 只选择，Enter / 明确按钮确认，直接拖拽松手一步投放；pending、failure、retry、cancel、success 与独立 Undo 集中反馈；宽屏与窄屏采用奇数可见窗口。

## 证据边界

本次 verdict 来自用户对多轮真实浏览器复核结果的明确接受。已有核验覆盖明暗主题、1536px 与 390px、点击选择、按钮确认、Q/E + Enter、真实拖拽松手、模拟失败后重试以及单次 Undo。

没有把未发生的测试写成已完成：此前约定的桌面连续处理 10 个、移动连续处理 5 个仓库没有独立测量记录；当前原型也没有实现「更多集合」与「新建集合」承接。两项从“是否接受视觉与交互方向”的前置门槛转入正式规格和生产验收，仍不得从完成条件中删除。

## 知识库变更

- 新增 ADR 0033，接受 Collection Dial 并划清原型已回答与未回答的问题。
- `contracts/product.md` 加入 Collection Dial 产品边界。
- `contracts/ui-ux.md` 加入正式 Collection Dial Pattern。
- `roadmap.md` 增加 Phase 2.2，并保留 Phase 3 可独立推进的关系。
- `state/BACKLOG.md` 关闭原型 verdict 开放项，新增规格 / 实现验收恢复点。
- `state/PROGRESS.md` 与 `state/NOTES.md` 更新当前 frontier。

## 下一步

在独立上下文运行 `/to-spec`。规格必须覆盖候选冻结与降级、单项 / 多选写入 seam、More / New 承接、Undo 身份、虚拟列表与移动误触、a11y / i18n，并明确原型何时退役；规格完成前不把 throwaway prototype 接入真实数据。
