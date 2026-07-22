export type {
  AiAdapterId,
  AiConnection,
  AiConnectionStatus,
  AiSettings,
  CreateAiConnectionInput,
  LocalePreference,
  ThemePreference,
  UpdateAiConnectionInput,
  UpdateAiSettingsInput,
} from './ai-connections';
export {
  createAiConnection,
  deleteAiConnection,
  discoverAiConnectionModels,
  getAiSettings,
  isAiConnection,
  isAiSettings,
  listAiConnections,
  testAiConnection,
  updateAiConnection,
  updateAiSettings,
} from './ai-connections';
export type {
  AiOrganizationAction,
  AiOrganizationDraft,
  AiOrganizationRelationType,
} from './ai-organization';
export {
  discardAiOrganizationDraft,
  generateAiOrganizationDraft,
  getAiOrganizationDraft,
  isAiOrganizationDraft,
} from './ai-organization';
export type { Session } from './auth';
export { getSession, onAuthChange, signInWithGitHub, signOut } from './auth';
export type {
  BulkChange,
  BulkItemStatus,
  BulkOperation,
  BulkOperationItem,
  BulkOperationRequest,
  BulkOperationStatus,
  BulkRelationAction,
  BulkRelationType,
} from './bulk-operations';
export { invokeBulkOperation, listBulkOperations } from './bulk-operations';
export type { SupabaseClient, SupabaseClientOptions } from './client';
export { createSupabaseClient } from './client';
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types';
export type { ImportUserDataResult } from './import-user-data';
export { importUserData } from './import-user-data';
export type { CollectionRepoLink } from './queries/collection-repos';
export {
  addRepoToCollection,
  listCollectionRepos,
  removeRepoFromCollection,
} from './queries/collection-repos';
export type { CollectionWithMeta } from './queries/collections';
export {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from './queries/collections';
export { getNote, listNoteRepoIds, listNotes, saveNote } from './queries/notes';
export type { RepoTagLink } from './queries/repo-tags';
export { addRepoTag, listRepoTags, removeRepoTag } from './queries/repo-tags';
export type { StarredRepoRecord } from './queries/repos';
export { getLatestStarredAt, listStarredRepos, mapRepoRow } from './queries/repos';
export type { TagWithCount } from './queries/tags';
export { createTag, deleteTag, listTags, updateTag } from './queries/tags';
export type { RepoReadmeOutcome, RepoReadmeRequest, RepoReadmeSuccess } from './readme';
export { invokeRepoReadme } from './readme';
export type { SyncStarsResult } from './sync';
export { invokeSyncStars, SyncStarsError } from './sync';
