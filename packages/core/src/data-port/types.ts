export const EXPORT_VERSION = 2 as const;
export const IMPORT_VERSIONS = [1, 2] as const;

export type ImportVersion = (typeof IMPORT_VERSIONS)[number];

export interface ExportTag {
  name: string;
  color: string | null;
}

export interface ExportCollection {
  name: string;
  description: string | null;
}

export interface ExportRepo {
  fullName: string;
  starredAt: string | null;
  language: string | null;
  description: string | null;
  topics: string[];
  stargazers: number;
  forks: number | null;
  archived: boolean;
  pushedAt: string | null;
}

export interface ExportRepoTag {
  fullName: string;
  tagName: string;
}

export interface ExportCollectionRepo {
  collectionName: string;
  fullName: string;
}

export interface ExportNote {
  fullName: string;
  body: string;
}

export interface ExportPayloadV1 {
  version: 1;
  exportedAt: string;
  counts: {
    repos: number;
    tags: number;
    collections: number;
    notes: number;
  };
  tags: ExportTag[];
  collections: ExportCollection[];
  repos: ExportRepo[];
  repoTags: ExportRepoTag[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}

export interface ExportPayloadV2 {
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  counts: {
    repos: number;
    collections: number;
    notes: number;
  };
  collections: ExportCollection[];
  repos: ExportRepo[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}

export type ExportPayload = ExportPayloadV2;

export interface ExportSnapshot {
  collections: ExportCollection[];
  repos: ExportRepo[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}

export interface ImportPayload {
  version: ImportVersion;
  exportedAt: string;
  collections: ExportCollection[];
  repos: ExportRepo[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}

export interface ParsedImportPayload {
  payload: ImportPayload;
}

export interface ImportIssue {
  kind: 'warning' | 'error';
  message: string;
}

export interface NormalizedImportData {
  collections: ExportCollection[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}
