export const EXPORT_VERSION = 1 as const;

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
  version: typeof EXPORT_VERSION;
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

export interface ExportSnapshot {
  tags: ExportTag[];
  collections: ExportCollection[];
  repos: ExportRepo[];
  repoTags: ExportRepoTag[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}

export interface ParsedImportPayload {
  payload: ExportPayloadV1;
}

export interface ImportIssue {
  kind: 'warning' | 'error';
  message: string;
}

export interface NormalizedImportData {
  tags: ExportTag[];
  collections: ExportCollection[];
  repoTags: ExportRepoTag[];
  collectionRepos: ExportCollectionRepo[];
  notes: ExportNote[];
}
