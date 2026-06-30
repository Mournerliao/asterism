export type CollectionId = string;

/**
 * 用户集合（对齐 data-model.md 的 `collections` 表）：把仓库按项目/主题分组。
 */
export interface Collection {
  id: CollectionId;
  name: string;
  description: string | null;
}
