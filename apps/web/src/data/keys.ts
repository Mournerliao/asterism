export const repoKeys = {
  all: ['repos'] as const,
  starred: (userId: string) => ['repos', 'starred', userId] as const,
  readme: (userId: string, owner: string, name: string) =>
    ['repos', 'readme', userId, owner.toLowerCase(), name.toLowerCase()] as const,
};

export const tagKeys = {
  all: ['tags'] as const,
  list: (userId: string) => ['tags', userId] as const,
};

export const repoTagKeys = {
  all: ['repo-tags'] as const,
  list: (userId: string) => ['repo-tags', userId] as const,
};

export const collectionKeys = {
  all: ['collections'] as const,
  list: (userId: string) => ['collections', userId] as const,
};

export const collectionRepoKeys = {
  all: ['collection-repos'] as const,
  list: (userId: string) => ['collection-repos', userId] as const,
};

export const noteKeys = {
  all: ['note'] as const,
  list: (userId: string) => ['note', userId, 'list'] as const,
  repoIds: (userId: string) => ['note', userId, 'repo-ids'] as const,
  detail: (userId: string, repoId: string) => ['note', userId, repoId] as const,
};
