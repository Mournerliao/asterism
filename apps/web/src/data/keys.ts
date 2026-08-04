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

export const bulkOperationKeys = {
  all: ['bulk-operations'] as const,
  list: (userId: string) => ['bulk-operations', userId] as const,
};

export const aiConnectionKeys = {
  all: ['ai-connections'] as const,
  list: (userId: string) => ['ai-connections', userId] as const,
};

export const aiSettingsKeys = {
  all: ['ai-settings'] as const,
  detail: (userId: string) => ['ai-settings', userId] as const,
};

export const aiOrganizationKeys = {
  all: ['ai-organization'] as const,
  draft: (userId: string) => ['ai-organization', 'draft', userId] as const,
};

export const organizationTaskKeys = {
  all: ['organization-tasks'] as const,
  list: (userId: string) => ['organization-tasks', userId, 'list'] as const,
  detail: (userId: string, taskId: string) =>
    ['organization-tasks', userId, 'detail', taskId] as const,
  review: (userId: string, taskId: string, planRevision: number) =>
    ['organization-tasks', userId, 'review', taskId, planRevision] as const,
  opportunities: (userId: string) => ['organization-tasks', userId, 'opportunities'] as const,
};

export const embeddingKeys = {
  all: ['embeddings'] as const,
  search: (userId: string, query: string) => ['embeddings', 'search', userId, query] as const,
  list: (userId: string) => ['embeddings', 'list', userId] as const,
};
