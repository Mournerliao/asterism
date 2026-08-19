/** Aligns with SQL `normalize_classification_name`: NFKC, trim, fold whitespace, lower. */
export function normalizeClassificationName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}
