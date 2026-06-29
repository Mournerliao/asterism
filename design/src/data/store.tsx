import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  type Collection,
  type Note,
  repos,
  collections as seedCollections,
  notes as seedNotes,
  repoTagMap as seedRepoTagMap,
  tags as seedTags,
  type Tag,
} from './mock';

const TAG_COLORS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

interface StoreValue {
  tags: Tag[];
  collections: Collection[];
  notes: Record<string, Note>;
  repoTags: Record<string, string[]>;
  // tag ops
  createTag: (name: string, color?: string) => void;
  renameTag: (id: string, name: string) => void;
  deleteTag: (id: string) => void;
  toggleRepoTag: (repoId: string, tagId: string) => void;
  // collection ops
  createCollection: (name: string, description?: string) => void;
  renameCollection: (id: string, name: string, description?: string) => void;
  deleteCollection: (id: string) => void;
  toggleRepoInCollection: (collectionId: string, repoId: string) => void;
  // note ops
  saveNote: (repoId: string, body: string) => void;
  deleteNote: (repoId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}_${++idCounter}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<Tag[]>(seedTags);
  const [collections, setCollections] = useState<Collection[]>(seedCollections);
  const [notes, setNotes] = useState<Record<string, Note>>(() =>
    Object.fromEntries(seedNotes.map((n) => [n.repoId, n])),
  );
  const [repoTags, setRepoTags] = useState<Record<string, string[]>>(seedRepoTagMap);

  const createTag = useCallback((name: string, color?: string) => {
    setTags((prev) => [
      ...prev,
      { id: nextId('tag'), name, color: color ?? TAG_COLORS[prev.length % TAG_COLORS.length] },
    ]);
  }, []);

  const renameTag = useCallback((id: string, name: string) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const deleteTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setRepoTags((prev) => {
      const next: Record<string, string[]> = {};
      for (const [repoId, ids] of Object.entries(prev)) {
        next[repoId] = ids.filter((tid) => tid !== id);
      }
      return next;
    });
  }, []);

  const toggleRepoTag = useCallback((repoId: string, tagId: string) => {
    setRepoTags((prev) => {
      const current = prev[repoId] ?? [];
      const has = current.includes(tagId);
      return {
        ...prev,
        [repoId]: has ? current.filter((id) => id !== tagId) : [...current, tagId],
      };
    });
  }, []);

  const createCollection = useCallback((name: string, description?: string) => {
    setCollections((prev) => [...prev, { id: nextId('col'), name, description, repoIds: [] }]);
  }, []);

  const renameCollection = useCallback((id: string, name: string, description?: string) => {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name, description } : c)));
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleRepoInCollection = useCallback((collectionId: string, repoId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id !== collectionId) return c;
        const has = c.repoIds.includes(repoId);
        return {
          ...c,
          repoIds: has ? c.repoIds.filter((id) => id !== repoId) : [...c.repoIds, repoId],
        };
      }),
    );
  }, []);

  const saveNote = useCallback((repoId: string, body: string) => {
    setNotes((prev) => ({
      ...prev,
      [repoId]: { repoId, body, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const deleteNote = useCallback((repoId: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      delete next[repoId];
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      tags,
      collections,
      notes,
      repoTags,
      createTag,
      renameTag,
      deleteTag,
      toggleRepoTag,
      createCollection,
      renameCollection,
      deleteCollection,
      toggleRepoInCollection,
      saveNote,
      deleteNote,
    }),
    [
      tags,
      collections,
      notes,
      repoTags,
      createTag,
      renameTag,
      deleteTag,
      toggleRepoTag,
      createCollection,
      renameCollection,
      deleteCollection,
      toggleRepoInCollection,
      saveNote,
      deleteNote,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { repos };
