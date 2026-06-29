import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { COLLECTIONS, type Collection, REPOS, type Repo, TAGS, type Tag } from './mock-data';

interface StoreValue {
  repos: Repo[];
  tags: Tag[];
  collections: Collection[];
  getRepo: (id: string) => Repo | undefined;
  toggleRepoTag: (repoId: string, tagId: string) => void;
  toggleRepoCollection: (repoId: string, collectionId: string) => void;
  setNote: (repoId: string, note: string) => void;
  createTag: (name: string, color: string) => void;
  renameTag: (tagId: string, name: string) => void;
  deleteTag: (tagId: string) => void;
  createCollection: (name: string, description?: string) => void;
  renameCollection: (collectionId: string, name: string, description?: string) => void;
  deleteCollection: (collectionId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let idCounter = 100;
const nextId = (prefix: string) => `${prefix}${idCounter++}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repo[]>(REPOS);
  const [tags, setTags] = useState<Tag[]>(TAGS);
  const [collections, setCollections] = useState<Collection[]>(COLLECTIONS);

  const value = useMemo<StoreValue>(
    () => ({
      repos,
      tags,
      collections,
      getRepo: (id) => repos.find((r) => r.id === id),
      toggleRepoTag: (repoId, tagId) =>
        setRepos((prev) =>
          prev.map((r) =>
            r.id === repoId
              ? {
                  ...r,
                  tagIds: r.tagIds.includes(tagId)
                    ? r.tagIds.filter((t) => t !== tagId)
                    : [...r.tagIds, tagId],
                }
              : r,
          ),
        ),
      toggleRepoCollection: (repoId, collectionId) =>
        setRepos((prev) =>
          prev.map((r) =>
            r.id === repoId
              ? {
                  ...r,
                  collectionIds: r.collectionIds.includes(collectionId)
                    ? r.collectionIds.filter((c) => c !== collectionId)
                    : [...r.collectionIds, collectionId],
                }
              : r,
          ),
        ),
      setNote: (repoId, note) =>
        setRepos((prev) => prev.map((r) => (r.id === repoId ? { ...r, note } : r))),
      createTag: (name, color) => setTags((prev) => [...prev, { id: nextId('t'), name, color }]),
      renameTag: (tagId, name) =>
        setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name } : t))),
      deleteTag: (tagId) => {
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        setRepos((prev) =>
          prev.map((r) => ({ ...r, tagIds: r.tagIds.filter((t) => t !== tagId) })),
        );
      },
      createCollection: (name, description) =>
        setCollections((prev) => [...prev, { id: nextId('c'), name, description }]),
      renameCollection: (collectionId, name, description) =>
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? { ...c, name, description } : c)),
        ),
      deleteCollection: (collectionId) => {
        setCollections((prev) => prev.filter((c) => c.id !== collectionId));
        setRepos((prev) =>
          prev.map((r) => ({
            ...r,
            collectionIds: r.collectionIds.filter((c) => c !== collectionId),
          })),
        );
      },
    }),
    [repos, tags, collections],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// Tag color → tailwind classes (light + dark via tokens kept neutral-friendly).
export const TAG_COLOR_CLASSES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300',
};

export const TAG_COLORS = ['amber', 'violet', 'sky', 'emerald', 'rose', 'orange', 'cyan'];
