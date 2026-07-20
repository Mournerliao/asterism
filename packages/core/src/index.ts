export const CORE_VERSION = '0.0.0';

export {
  buildExportPayload,
  scopeExportSnapshot,
  serializeExportCsv,
  serializeExportJson,
  serializeExportMarkdown,
} from './data-port/export';
export { normalizeImportData, parseImportJson } from './data-port/import';
export type {
  ExportCollection,
  ExportCollectionRepo,
  ExportNote,
  ExportPayloadV1,
  ExportRepo,
  ExportRepoTag,
  ExportSnapshot,
  ExportTag,
  NormalizedImportData,
  ParsedImportPayload,
} from './data-port/types';
export { EXPORT_VERSION } from './data-port/types';
export type {
  CollectStarredOptions,
  FetchStarredPage,
  RawStarEdge,
  StarredPage,
  StarredRepo,
} from './github/stars';
export {
  collectStarredRepos,
  createGitHubStarsFetcher,
  GitHubSyncError,
  mapStarEdgeToRepo,
  STARRED_REPOS_QUERY,
} from './github/stars';
export type { Collection, CollectionId } from './models/collection';
export type { Note } from './models/note';
export type { Repo, RepoId } from './models/repo';
export { repoFullName } from './models/repo';
export type { Tag, TagId } from './models/tag';
export { pickTagColor, TAG_COLORS } from './models/tag';
export type {
  ArchiveSplit,
  DashboardInsights,
  DashboardStats,
  DeriveDashboardInput,
  NamedCount,
  RepoTagLink,
  TagUsage,
  YearCount,
} from './repos/analytics';
export { deriveDashboardInsights } from './repos/analytics';
export type {
  RepoFacets,
  RepoFilter,
  RepoSort,
  RepoStatus,
  StarredRepoLike,
} from './repos/filter';
export {
  deriveRepoFacets,
  filterStarredRepos,
  hasActiveFilter,
  sortStarredRepos,
} from './repos/filter';
