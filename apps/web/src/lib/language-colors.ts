/**
 * 常见语言的标识色（取自 GitHub Linguist 色板）。仅用于仓库卡片的小圆点，
 * 未知语言回退到 muted-foreground（用 currentColor 表示）。
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  Zig: '#ec915c',
  Clojure: '#db5855',
};

export function languageColor(language: string | null): string | null {
  if (!language) {
    return null;
  }
  return LANGUAGE_COLORS[language] ?? null;
}
