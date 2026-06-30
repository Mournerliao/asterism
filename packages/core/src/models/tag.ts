export type TagId = string;

/**
 * 用户自定义标签（对齐 data-model.md 的 `tags` 表）。
 * `color` 为可选的十六进制色值，用于 UI 着色；缺省时由前端回退到中性色。
 */
export interface Tag {
  id: TagId;
  name: string;
  color: string | null;
}

/** 预设标签配色（GitHub 风格强调色），新建标签按序取色，保证视觉区分度。 */
export const TAG_COLORS = [
  '#0969da',
  '#1a7f37',
  '#bf3989',
  '#9a6700',
  '#cf222e',
  '#8250df',
  '#bc4c00',
  '#1b7c83',
] as const;

/** 依据已有标签数量挑选下一个配色，循环复用调色板。 */
export function pickTagColor(seed: number): string {
  const size = TAG_COLORS.length;
  const index = ((Math.trunc(seed) % size) + size) % size;
  return TAG_COLORS[index] as string;
}
