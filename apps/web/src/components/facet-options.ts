const DEFAULT_OPTION_LIMIT = 20;
const SEARCH_OPTION_LIMIT = 50;

export interface VisibleFacetOptions {
  items: string[];
  total: number;
  truncated: boolean;
}

export interface LabeledFacetOption {
  value: string;
  label: string;
}

function selectedValues(selected: string | readonly string[] | null): string[] {
  if (selected == null) {
    return [];
  }
  return typeof selected === 'string' ? [selected] : [...selected];
}

export function getVisibleFacetOptions(
  options: readonly string[],
  query: string,
  selected: string | readonly string[] | null,
): VisibleFacetOptions {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? options.filter((option) => option.toLocaleLowerCase().includes(normalizedQuery))
    : [...options];
  const limit = normalizedQuery ? SEARCH_OPTION_LIMIT : DEFAULT_OPTION_LIMIT;
  const pinned = selectedValues(selected).filter((value) => matches.includes(value));

  if (!normalizedQuery && pinned.length > 0) {
    const window = matches.slice(0, limit);
    const missing = pinned.filter((value) => !window.includes(value));
    if (missing.length > 0) {
      const items = [...missing, ...matches.filter((option) => !missing.includes(option))].slice(
        0,
        Math.min(SEARCH_OPTION_LIMIT, Math.max(limit, missing.length)),
      );
      return { items, total: matches.length, truncated: matches.length > items.length };
    }
  }

  const items = matches.slice(0, limit);
  return { items, total: matches.length, truncated: matches.length > items.length };
}

export function getVisibleLabeledFacetOptions(
  options: readonly LabeledFacetOption[],
  query: string,
  selected: readonly string[],
): { items: LabeledFacetOption[]; total: number; truncated: boolean } {
  const labels = options.map((option) => option.label);
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);
  const visible = getVisibleFacetOptions(labels, query, selectedLabels);
  const byLabel = new Map(options.map((option) => [option.label, option]));
  return {
    items: visible.items.flatMap((label) => {
      const option = byLabel.get(label);
      return option ? [option] : [];
    }),
    total: visible.total,
    truncated: visible.truncated,
  };
}
