import {
  filterStarredRepos,
  type RepoFilter,
  type RepoSort,
  type StarredRepoLike,
  sortStarredRepos,
} from './filter';

/** 「隐形混合搜索」的输入：现有筛选/排序 + 可选的语义距离图。 */
export interface HybridRankInput<T extends StarredRepoLike> {
  items: T[];
  filter: RepoFilter;
  sort: RepoSort;
  now?: number;
  tagsByRepoId?: Map<string, string[]>;
  /** repoId → 语义距离（越小越近）；缺省 / 空表示不做语义扩展。 */
  distanceByRepoId?: ReadonlyMap<string, number>;
  /** 语义近邻最多补充多少条；缺省表示不限。 */
  semanticLimit?: number;
}

/** 单一结果画布拆成两段：关键词命中在上，语义近邻在下。 */
export interface HybridRankResult<T extends StarredRepoLike> {
  /** 关键词 + 筛选命中，按所选维度排序（等价于原有 Browse 列表）。 */
  primary: T[];
  /** 未命中关键词但语义相近的补充项，按距离升序（同距离按 fullName 稳定）。 */
  semantic: T[];
}

/**
 * 把关键词命中与语义近邻融合进同一排序，无模式开关（ADR 0026 §7）：
 * - primary 完全复用既有 filter + sort 路径，保证零回归；
 * - semantic 仅在有查询词且拿到距离图时出现，取「满足同一 facet、未命中关键词、
 *   且有距离」的仓库按距离升序补充。设备/模型未就绪 → 距离图为空 → 自然退化为纯关键词。
 * 纯函数，不修改输入。
 */
export function rankHybridRepos<T extends StarredRepoLike>({
  items,
  filter,
  sort,
  now = Date.now(),
  tagsByRepoId,
  distanceByRepoId,
  semanticLimit,
}: HybridRankInput<T>): HybridRankResult<T> {
  const query = filter.query?.trim() ?? '';
  const facetEligible = filterStarredRepos(items, { ...filter, query: '' }, now, tagsByRepoId);

  if (!query) {
    return { primary: sortStarredRepos(facetEligible, sort), semantic: [] };
  }

  const keywordMatches = filterStarredRepos(items, filter, now, tagsByRepoId);
  const primary = sortStarredRepos(keywordMatches, sort);

  if (!distanceByRepoId || distanceByRepoId.size === 0) {
    return { primary, semantic: [] };
  }

  const matched = new Set<T>(keywordMatches);
  const neighbors = facetEligible.filter((entry) => {
    if (matched.has(entry)) {
      return false;
    }
    return entry.repoId != null && distanceByRepoId.has(entry.repoId);
  });
  neighbors.sort((a, b) => {
    const da = distanceByRepoId.get(a.repoId as string) as number;
    const db = distanceByRepoId.get(b.repoId as string) as number;
    return da !== db ? da - db : a.repo.fullName.localeCompare(b.repo.fullName);
  });

  const semantic = semanticLimit != null ? neighbors.slice(0, semanticLimit) : neighbors;
  return { primary, semantic };
}
