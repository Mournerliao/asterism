# Asterism · 高保真设计原型

包含全部 Phase 1 功能的可视化原型，使用 **mock 数据**（无真实后端 / 无 GitHub 授权）。
用于在投入 `apps/web` 真实实现前，确认信息架构、交互与视觉方向。

## 运行

```bash
pnpm --filter @asterism/design dev      # 启动 Vite 开发服务器
pnpm --filter @asterism/design build    # 生产构建
```

> 注意：`apps/web` 默认占用 5173 端口，本原型会自动选择下一个可用端口。

## 技术栈

- React 19 + Vite 6 + TypeScript
- Tailwind v4（tokens 对齐 `knowledge/contracts/ui-ux.md` 的 shadcn neutral 主题）
- React Router（页面路由）
- TanStack Virtual（浏览视图虚拟滚动，支撑上万条）
- Recharts（仪表盘可视化）
- lucide-react（图标）

## 覆盖的功能（对应 product.md 的 MVP）

| 模块 | 路径 | 说明 |
| --- | --- | --- |
| 登录 | `/` (未登录) | GitHub OAuth 入口、价值主张、最小权限说明 |
| 同步 | 顶栏 + 横幅 | 全量/增量同步进度、完成、失败可重试模拟 |
| 浏览 | `/browse` | 卡片/列表切换、虚拟滚动、排序 |
| 筛选/搜索 | `/browse` | 语言 / 主题 / 标签 / Star 数 / 更新时间 / 归档 多维组合 + 关键词搜索 |
| 仓库详情 | 抽屉 | 元信息、主题、打标签、加入集合、笔记编辑 |
| 标签 | `/tags` | 标签 CRUD、配色、使用计数 |
| 集合 | `/collections`, `/collections/:id` | 集合 CRUD、归集、详情 |
| 仪表盘 | `/dashboard` | 语言/主题/趋势/标签/归档占比可视化 |
| 导入导出 | `/import-export` | JSON / CSV 导出预览与下载、导入投放区 |
| 设置 | `/settings` | 主题（跟随系统/浅/深）、语言（zh-CN/en）、账户、Phase 3 AI BYOK 预览 |

## 横切能力

- **明暗模式**：跟随系统 + 持久化（`localStorage`）
- **国际化**：简体中文 / English，全部文案外部化于 `src/i18n`
- **可访问性**：语义标签、ARIA、键盘可达、`sr-only`

## 目录

```
src/
  app/            会话与同步状态（mock）
  components/
    app/          业务组件（侧栏、筛选栏、仓库卡/行、详情抽屉、同步指示器…）
    ui/           基础原语（button / card / badge / dialog / sheet / popover…）
  data/           mock 数据 + 内存 store（标签/集合/笔记 CRUD）
  i18n/           中英文字典
  lib/            筛选排序纯函数、工具
  pages/          各功能页面
  theme/          主题 provider
```

所有交互均在内存中模拟，刷新页面会重置为初始 mock 状态。
