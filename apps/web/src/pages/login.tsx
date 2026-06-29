import { Check, Github, Search, Sparkles, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { LanguageToggle, ThemeToggle } from '@/components/top-controls';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { icon: Search, title: '多维检索', desc: '按语言、topic、star 数、更新时间组合筛选，秒级定位。' },
  { icon: Tags, title: '标签与集合', desc: '给收藏打标签、归集合、写笔记，沉淀为个人知识星图。' },
  { icon: Sparkles, title: '开源自托管', desc: '数据自主可导出，支持自部署，AI 能力 BYOK。' },
];

const PERKS = ['仅需公开数据最小权限', '会话持久化', '增量同步不重复拉取'];

export function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: brand / value prop */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <ConstellationBackdrop />
        <div className="relative flex items-center gap-2">
          <Logo className="size-6" />
          <span className="font-semibold text-lg">Asterism</span>
        </div>
        <div className="relative flex flex-col gap-6">
          <h1 className="text-balance font-semibold text-3xl leading-tight">
            把杂乱的 GitHub Star
            <br />
            连成有意义的星座。
          </h1>
          <p className="max-w-md text-pretty text-primary-foreground/70 leading-relaxed">
            成百上千个随手点下的 starred 仓库，重新组织成可检索、可标注、可分类的个人知识星图。
          </p>
          <ul className="flex flex-col gap-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-primary-foreground/80 text-sm">
                <Check className="size-4" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-primary-foreground/50 text-xs">开源 · MIT License · 多端共享</p>
      </aside>

      {/* Right: sign in */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-end gap-1 p-4">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="flex w-full max-w-sm flex-col gap-8">
            <div className="flex flex-col items-center gap-3 text-center lg:hidden">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Logo className="size-6" />
              </div>
              <h1 className="font-semibold text-2xl">Asterism</h1>
            </div>

            <div className="flex flex-col gap-2 text-center">
              <h2 className="font-semibold text-2xl tracking-tight">欢迎回来</h2>
              <p className="text-muted-foreground text-sm">
                使用 GitHub 账号登录，开始整理你的星图。
              </p>
            </div>

            <Button asChild size="lg" className="w-full">
              <Link to="/app">
                <Github data-icon="inline-start" />
                使用 GitHub 登录
              </Link>
            </Button>

            <div className="flex flex-col gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                    <f.icon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium text-sm">{f.title}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-balance text-center text-muted-foreground text-xs leading-relaxed">
              登录即表示同意以只读方式访问你的公开 star 列表。
              <br />
              我们不会在未授权时执行任何写操作。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstellationBackdrop() {
  // Decorative starfield using positioned dots + faint connecting lines.
  const stars = [
    { x: 12, y: 18 },
    { x: 28, y: 42 },
    { x: 44, y: 22 },
    { x: 62, y: 36 },
    { x: 78, y: 16 },
    { x: 88, y: 48 },
    { x: 20, y: 70 },
    { x: 40, y: 82 },
    { x: 58, y: 66 },
    { x: 76, y: 80 },
  ];
  return (
    <svg
      className="absolute inset-0 size-full text-primary-foreground/15"
      aria-hidden
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <title>constellation</title>
      <polyline
        points="12,18 28,42 44,22 62,36 78,16"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.2"
      />
      <polyline
        points="20,70 40,82 58,66 76,80 88,48"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.2"
      />
      {stars.map((s) => (
        <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r="0.5" fill="currentColor" />
      ))}
    </svg>
  );
}
