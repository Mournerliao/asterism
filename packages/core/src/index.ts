export const CORE_VERSION = '0.0.0';

export type {
  BaseUrlValidation,
  CredentialValidation,
  GenerationAdapterId,
  GenerationCredential,
  GenerationTarget,
  ModelDiscoveryTarget,
  OrganizationAction,
  OrganizationClassificationCandidate,
  OrganizationDraft,
  OrganizationGenerationInput,
  OrganizationGenerationOutcome,
  OrganizationGenerationTarget,
  OrganizationNewClassification,
  OrganizationRelationChange,
  OrganizationRelationType,
  OrganizationRepositoryInput,
  OrganizationSuggestion,
  ProbeOutcome,
  ProviderRequest,
  RawProviderResponse,
  ValidatedOrganizationDraft,
} from './ai/generation-registry';
export {
  BUILTIN_GENERATION_HOSTS,
  buildGenerationProbeRequest,
  buildModelDiscoveryRequest,
  buildOrganizationGenerationRequest,
  extractJsonObject,
  GENERATION_ADAPTER_IDS,
  GenerationRegistryError,
  interpretGenerationProbeResponse,
  interpretOrganizationGenerationResponse,
  isCustomGenerationAdapter,
  isOrganizationDraft,
  parseModelDiscoveryResponse,
  resolveGenerationBaseUrl,
  validateGenerationBaseUrl,
  validateGenerationCredential,
} from './ai/generation-registry';
export type {
  GenerationCapabilityView,
  GenerationConnectionStatus,
  GenerationSelectionResult,
  GenerationSelectionState,
} from './ai/generation-selection';
export {
  readGenerationCapability,
  readTestedModel,
  resolveActiveGenerationModel,
} from './ai/generation-selection';
export type {
  AiOrganizationDraft,
  AiOrganizationReviewChange,
  AiOrganizationReviewSuggestions,
} from './ai/organization-review';
export { isAiOrganizationReviewSuggestions } from './ai/organization-review';
export type {
  DnsResolver,
  HostAllowlist,
  IpClassification,
  UrlGuardOptions,
} from './ai/ssrf';
export {
  assertUrlIsSafe,
  classifyIp,
  hostMatchesAllowlist,
  isPubliclyRoutableIp,
  parseHttpsUrl,
  SsrfError,
} from './ai/ssrf';
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
  DesiredRepoEmbedding,
  EmbeddableRepo,
  EmbeddingBackfillProgress,
  EmbeddingBackfillTarget,
  EmbeddingStalenessReason,
  RepoEmbeddingBackfillItem,
  StoredRepoEmbedding,
} from './embeddings/embeddings';
export {
  computeContentHash,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  E5_PASSAGE_PREFIX,
  E5_QUERY_PREFIX,
  EMBEDDING_BACKFILL_BATCH_SIZE,
  embeddableRepoText,
  repoContentHash,
  runEmbeddingBackfill,
  selectReposToEmbed,
  toPassageInput,
  toQueryInput,
} from './embeddings/embeddings';
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
