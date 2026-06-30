export const repoKeys = {
  all: ['repos'] as const,
  starred: (userId: string) => ['repos', 'starred', userId] as const,
};
