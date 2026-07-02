export type { Session } from './auth';
export { getSession, onAuthChange, signInWithGitHub, signOut } from './auth';
export type { CachedRepo } from './cache';
export { AsterismCache } from './cache';
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
export { getNote, listNotes, saveNote } from './queries/notes';
export type { RepoTagLink } from './queries/repo-tags';
export { addRepoTag, listRepoTags, removeRepoTag } from './queries/repo-tags';
export type { StarredRepoRecord } from './queries/repos';
export { getLatestStarredAt, listStarredRepos, mapRepoRow } from './queries/repos';
export type { TagWithCount } from './queries/tags';
export { createTag, deleteTag, listTags, updateTag } from './queries/tags';
export type { SyncStarsResult } from './sync';
export { invokeSyncStars, SyncStarsError } from './sync';
