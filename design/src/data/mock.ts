// Mock data for the Asterism design prototype.
// Mirrors the shape of the data-model contract (repos / user_stars / tags / collections / notes).

export interface Repo {
  id: string;
  githubId: number;
  fullName: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  topics: string[];
  stargazers: number;
  forks: number;
  homepage?: string;
  pushedAt: string;
  repoCreatedAt: string;
  archived: boolean;
  isFork: boolean;
  starredAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // chart token key, e.g. "chart-1"
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  repoIds: string[];
}

export interface Note {
  repoId: string;
  body: string;
  updatedAt: string;
}

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  Ruby: '#701516',
  Java: '#b07219',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  Lua: '#000080',
  Vue: '#41b883',
};

const LANGUAGES = Object.keys(LANGUAGE_COLORS);

const ALL_TOPICS = [
  'cli',
  'framework',
  'react',
  'database',
  'ai',
  'llm',
  'devtools',
  'web',
  'performance',
  'terminal',
  'editor',
  'compiler',
  'wasm',
  'graphql',
  'testing',
  'serverless',
  'kubernetes',
  'observability',
  'security',
  'design-system',
  'state-management',
  'animation',
  'parsing',
  'networking',
];

// Hand-curated, recognizable seed repos so the prototype feels real.
const SEED: Array<Partial<Repo> & { fullName: string; language: string; description: string }> = [
  {
    fullName: 'vercel/next.js',
    language: 'JavaScript',
    description: 'The React Framework — used by some of the world\u2019s largest companies.',
    topics: ['react', 'framework', 'web', 'serverless'],
    stargazers: 128400,
    forks: 27600,
  },
  {
    fullName: 'rust-lang/rust',
    language: 'Rust',
    description: 'Empowering everyone to build reliable and efficient software.',
    topics: ['compiler', 'performance', 'cli'],
    stargazers: 98700,
    forks: 12800,
  },
  {
    fullName: 'tailwindlabs/tailwindcss',
    language: 'TypeScript',
    description: 'A utility-first CSS framework for rapid UI development.',
    topics: ['web', 'design-system', 'framework'],
    stargazers: 83100,
    forks: 4200,
  },
  {
    fullName: 'ollama/ollama',
    language: 'Go',
    description: 'Get up and running with large language models locally.',
    topics: ['ai', 'llm', 'cli'],
    stargazers: 96200,
    forks: 7600,
  },
  {
    fullName: 'pola-rs/polars',
    language: 'Rust',
    description: 'Dataframes powered by a multithreaded, vectorized query engine.',
    topics: ['database', 'performance', 'parsing'],
    stargazers: 30900,
    forks: 1900,
  },
  {
    fullName: 'denoland/deno',
    language: 'Rust',
    description: 'A modern runtime for JavaScript and TypeScript.',
    topics: ['cli', 'web', 'compiler'],
    stargazers: 97800,
    forks: 5300,
  },
  {
    fullName: 'tanstack/query',
    language: 'TypeScript',
    description: 'Powerful asynchronous state management for TS/JS, React, Solid, Vue and Svelte.',
    topics: ['react', 'state-management', 'web'],
    stargazers: 42600,
    forks: 2900,
  },
  {
    fullName: 'shadcn-ui/ui',
    language: 'TypeScript',
    description: 'Beautifully designed components that you can copy and paste into your apps.',
    topics: ['react', 'design-system', 'web'],
    stargazers: 73400,
    forks: 4800,
  },
  {
    fullName: 'zed-industries/zed',
    language: 'Rust',
    description: 'Code at the speed of thought — a high-performance, multiplayer code editor.',
    topics: ['editor', 'performance', 'devtools'],
    stargazers: 49200,
    forks: 2900,
  },
  {
    fullName: 'supabase/supabase',
    language: 'TypeScript',
    description: 'The open source Firebase alternative.',
    topics: ['database', 'serverless', 'web'],
    stargazers: 71800,
    forks: 6900,
  },
  {
    fullName: 'ggerganov/llama.cpp',
    language: 'C++',
    description: 'LLM inference in C/C++.',
    topics: ['ai', 'llm', 'performance'],
    stargazers: 67100,
    forks: 9600,
  },
  {
    fullName: 'withastro/astro',
    language: 'TypeScript',
    description: 'The web framework for content-driven websites.',
    topics: ['web', 'framework', 'performance'],
    stargazers: 46300,
    forks: 2500,
  },
  {
    fullName: 'charmbracelet/bubbletea',
    language: 'Go',
    description: 'A powerful little TUI framework.',
    topics: ['cli', 'terminal', 'framework'],
    stargazers: 27400,
    forks: 720,
  },
  {
    fullName: 'biomejs/biome',
    language: 'Rust',
    description: 'A toolchain for web projects — format, lint, and more.',
    topics: ['devtools', 'performance', 'cli'],
    stargazers: 15800,
    forks: 560,
  },
  {
    fullName: 'drizzle-team/drizzle-orm',
    language: 'TypeScript',
    description: 'Headless TypeScript ORM with a head. SQL-like and relational.',
    topics: ['database', 'devtools', 'web'],
    stargazers: 24200,
    forks: 690,
  },
];

const OWNERS = [
  'acme',
  'octolab',
  'nova',
  'forge',
  'lumen',
  'monorail',
  'kettle',
  'pixelworks',
  'northwind',
  'stellar',
  'cobalt',
  'umbra',
  'helix',
  'quanta',
  'driftwood',
];

const NAME_PARTS_A = [
  'fast',
  'micro',
  'hyper',
  'lite',
  'core',
  'flux',
  'nano',
  'turbo',
  'edge',
  'open',
  'smart',
  'cloud',
];
const NAME_PARTS_B = [
  'kit',
  'stack',
  'forge',
  'query',
  'router',
  'store',
  'sync',
  'lens',
  'graph',
  'parser',
  'engine',
  'studio',
];

const DESCRIPTIONS = [
  'A lightweight library for building composable user interfaces.',
  'Blazing-fast tooling for modern application development.',
  'Type-safe utilities with zero runtime overhead.',
  'A minimal, dependency-free state container.',
  'Declarative data fetching and caching for the edge.',
  'An ergonomic CLI for managing project workflows.',
  'Pluggable parser with a tiny footprint.',
  'High-performance primitives for real-time apps.',
  'A batteries-included framework for the modern web.',
  'Observability and tracing made simple.',
];

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function buildRepo(index: number, partial?: Partial<Repo> & { fullName: string }): Repo {
  const rand = seededRandom(index + 1);
  let fullName: string;
  let owner: string;
  let name: string;

  if (partial?.fullName) {
    fullName = partial.fullName;
    [owner, name] = fullName.split('/');
  } else {
    owner = pick(rand, OWNERS);
    name = `${pick(rand, NAME_PARTS_A)}${pick(rand, NAME_PARTS_B)}`;
    fullName = `${owner}/${name}`;
  }

  const language = partial?.language ?? pick(rand, LANGUAGES);
  const topicCount = 1 + Math.floor(rand() * 3);
  const topics =
    partial?.topics ??
    Array.from({ length: topicCount }, () => pick(rand, ALL_TOPICS)).filter(
      (v, i, a) => a.indexOf(v) === i,
    );
  const stargazers = partial?.stargazers ?? Math.floor(rand() * rand() * 60_000);
  const forks = partial?.forks ?? Math.floor(stargazers * (0.05 + rand() * 0.15));
  const pushedDays = Math.floor(rand() * 540);
  const archived = partial?.archived ?? (pushedDays > 400 && rand() > 0.6);

  return {
    id: `repo_${index}`,
    githubId: 100000 + index,
    fullName,
    name,
    owner,
    description: partial?.description ?? pick(rand, DESCRIPTIONS),
    language,
    topics,
    stargazers,
    forks,
    homepage: rand() > 0.6 ? `https://${name}.dev` : undefined,
    pushedAt: isoDaysAgo(pushedDays),
    repoCreatedAt: isoDaysAgo(pushedDays + 200 + Math.floor(rand() * 1500)),
    archived,
    isFork: rand() > 0.85,
    starredAt: isoDaysAgo(Math.floor(rand() * 720)),
  };
}

const TOTAL = 620;

export const repos: Repo[] = [
  ...SEED.map((s, i) => buildRepo(i, s as Partial<Repo> & { fullName: string })),
  ...Array.from({ length: TOTAL - SEED.length }, (_, i) => buildRepo(i + SEED.length)),
];

export const tags: Tag[] = [
  { id: 'tag_1', name: '想学习', color: 'chart-1' },
  { id: 'tag_2', name: '生产在用', color: 'chart-2' },
  { id: 'tag_3', name: '灵感参考', color: 'chart-3' },
  { id: 'tag_4', name: 'AI 相关', color: 'chart-4' },
  { id: 'tag_5', name: '待评估', color: 'chart-5' },
];

// Deterministically assign a few tags to the seed + early repos.
export const repoTagMap: Record<string, string[]> = {
  repo_0: ['tag_2', 'tag_3'],
  repo_1: ['tag_1'],
  repo_2: ['tag_2'],
  repo_3: ['tag_4', 'tag_1'],
  repo_4: ['tag_5'],
  repo_6: ['tag_2', 'tag_3'],
  repo_7: ['tag_2', 'tag_3'],
  repo_8: ['tag_1'],
  repo_10: ['tag_4'],
  repo_13: ['tag_2'],
  repo_14: ['tag_2', 'tag_1'],
};

export const collections: Collection[] = [
  {
    id: 'col_1',
    name: '前端星座',
    description: 'Web / UI 框架与设计系统',
    repoIds: ['repo_0', 'repo_2', 'repo_6', 'repo_7', 'repo_11', 'repo_14'],
  },
  {
    id: 'col_2',
    name: 'AI 工具链',
    description: '本地推理、LLM 与向量检索',
    repoIds: ['repo_3', 'repo_10'],
  },
  {
    id: 'col_3',
    name: 'Rust 高性能',
    description: '系统级与高性能工具',
    repoIds: ['repo_1', 'repo_4', 'repo_5', 'repo_8', 'repo_13'],
  },
  {
    id: 'col_4',
    name: '命令行 / 终端',
    description: 'CLI 与 TUI 体验',
    repoIds: ['repo_12'],
  },
];

export const notes: Note[] = [
  {
    repoId: 'repo_0',
    body: '生产项目的主力框架。关注 App Router 的缓存语义与 Server Actions 的演进。',
    updatedAt: isoDaysAgo(3),
  },
  {
    repoId: 'repo_3',
    body: '本地跑 Llama / Qwen 很方便。后续接 Asterism 的 BYOK 语义检索可以参考它的 embedding 接口。',
    updatedAt: isoDaysAgo(12),
  },
  {
    repoId: 'repo_7',
    body: 'Asterism 的 UI 基底就是它。注意 tokens 要对齐设计契约的 neutral 主题。',
    updatedAt: isoDaysAgo(1),
  },
];

export const allLanguages = Array.from(new Set(repos.map((r) => r.language))).sort();
export const allTopics = Array.from(new Set(repos.flatMap((r) => r.topics))).sort();
