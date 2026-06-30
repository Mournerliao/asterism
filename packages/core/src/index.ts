export const CORE_VERSION = '0.0.0';

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
export type { Repo, RepoId } from './models/repo';
export { repoFullName } from './models/repo';
