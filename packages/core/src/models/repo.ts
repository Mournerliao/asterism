export type RepoId = string;

/**
 * 全局共享的 GitHub 仓库元数据（对齐 knowledge/contracts/data-model.md 的 `repos` 表）。
 * 字段命名采用 camelCase，由数据层在读写 Postgres 时做行/列映射。
 */
export interface Repo {
  githubId: number;
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stargazers: number;
  forks: number | null;
  homepage: string | null;
  pushedAt: string | null;
  repoCreatedAt: string | null;
  archived: boolean;
  isFork: boolean | null;
  syncedAt: string;
}

export function repoFullName(repo: Pick<Repo, 'owner' | 'name'>): string {
  return `${repo.owner}/${repo.name}`;
}
