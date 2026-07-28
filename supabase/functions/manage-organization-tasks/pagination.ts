export const POSTGREST_PAGE_SIZE = 1_000;

export async function loadAllPages<T>(
  loadPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  errorCode = 'organization_discovery_interrupted',
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; ) {
    const { data, error } = await loadPage(offset, offset + POSTGREST_PAGE_SIZE - 1);
    if (error) throw new Error(errorCode);
    const page = data ?? [];
    if (page.length === 0) return rows;
    rows.push(...page);
    offset += page.length;
  }
}
