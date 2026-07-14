const DEFAULT_OPTION_LIMIT = 20;
const SEARCH_OPTION_LIMIT = 50;

export interface VisibleFacetOptions {
  items: string[];
  total: number;
  truncated: boolean;
}

export function getVisibleFacetOptions(
  options: readonly string[],
  query: string,
  selected: string | null,
): VisibleFacetOptions {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? options.filter((option) => option.toLocaleLowerCase().includes(normalizedQuery))
    : [...options];
  const limit = normalizedQuery ? SEARCH_OPTION_LIMIT : DEFAULT_OPTION_LIMIT;

  if (!normalizedQuery && selected && !matches.slice(0, limit).includes(selected)) {
    const items = [selected, ...matches.filter((option) => option !== selected)].slice(0, limit);
    return { items, total: matches.length, truncated: matches.length > items.length };
  }

  const items = matches.slice(0, limit);
  return { items, total: matches.length, truncated: matches.length > items.length };
}
