import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useEmbeddingBootstrap } from '../data/use-embedding-bootstrap';
import { useStarredRepos } from '../data/use-starred-repos';

type EmbeddingBootstrapContextValue = ReturnType<typeof useEmbeddingBootstrap> & {
  repositoryCount: number;
};

const EmbeddingBootstrapContext = createContext<EmbeddingBootstrapContextValue | null>(null);

export function EmbeddingBootstrapProvider({ children }: { children: ReactNode }) {
  const { data } = useStarredRepos();
  const records = useMemo(() => data ?? [], [data]);
  const bootstrap = useEmbeddingBootstrap(records);
  const value = useMemo(
    () => ({ ...bootstrap, repositoryCount: records.length }),
    [bootstrap, records.length],
  );

  return (
    <EmbeddingBootstrapContext.Provider value={value}>
      {children}
    </EmbeddingBootstrapContext.Provider>
  );
}

export function useEmbeddingBootstrapContext() {
  const value = useContext(EmbeddingBootstrapContext);
  if (!value) {
    throw new Error('useEmbeddingBootstrapContext must be used within EmbeddingBootstrapProvider');
  }
  return value;
}
