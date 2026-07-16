import type { Tag } from '@asterism/core';
import { Button } from '@asterism/ui';
import { ArrowLeftIcon, FolderIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/empty-state';
import { CollectionDetailRouteLoading } from '../components/page-loading-states';
import { RepoCollection } from '../components/repo-collection';
import { useRepoInspector } from '../contexts/repo-inspector-context';
import { useCollectionRepos } from '../data/use-collection-repos';
import { useCollections } from '../data/use-collections';
import { useRepoTags } from '../data/use-repo-tags';
import { useStarredRepos } from '../data/use-starred-repos';
import { useTags } from '../data/use-tags';
import { useRepoInspectorStore } from '../stores/repo-inspector';

export function CollectionDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { requestOpen, registerContext } = useRepoInspector();
  const selectedRepoId = useRepoInspectorStore((state) => state.record?.repoId);

  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const { data: starredRepos, isLoading: reposLoading } = useStarredRepos();
  const { data: collectionRepos, isLoading: linksLoading } = useCollectionRepos();
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: repoTags, isLoading: repoTagsLoading } = useRepoTags();

  const collection = useMemo(
    () => (collections ?? []).find((item) => item.id === id),
    [collections, id],
  );

  const memberRecords = useMemo(() => {
    if (!collection || !starredRepos) {
      return [];
    }
    const memberIds = new Set(
      (collectionRepos ?? [])
        .filter((link) => link.collectionId === collection.id)
        .map((link) => link.repoId),
    );
    return starredRepos.filter((record) => memberIds.has(record.repoId));
  }, [collection, collectionRepos, starredRepos]);
  const inspectorContext = useMemo(
    () => ({
      sourceKey: `collection:${id ?? 'unknown'}`,
      sourceName: collection?.name,
      records: memberRecords,
    }),
    [collection?.name, id, memberRecords],
  );
  const openInspector = useCallback(
    (record: (typeof memberRecords)[number], modality: 'keyboard' | 'pointer') =>
      requestOpen(record, inspectorContext, modality),
    [inspectorContext, requestOpen],
  );

  useEffect(() => {
    registerContext(inspectorContext);
  }, [inspectorContext, registerContext]);

  const tagsByRepo = useMemo(() => {
    const byId = new Map((tags ?? []).map((tag) => [tag.id, tag as Tag]));
    const map = new Map<string, Tag[]>();
    for (const link of repoTags ?? []) {
      const tag = byId.get(link.tagId);
      if (!tag) {
        continue;
      }
      const list = map.get(link.repoId);
      if (list) {
        list.push(tag);
      } else {
        map.set(link.repoId, [tag]);
      }
    }
    return map;
  }, [tags, repoTags]);

  const isLoading =
    collectionsLoading || reposLoading || linksLoading || tagsLoading || repoTagsLoading;
  const count = new Intl.NumberFormat(i18n.language).format(memberRecords.length);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  if (isLoading) {
    return <CollectionDetailRouteLoading label={t('loading.collection')} />;
  }

  if (!collection) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto">
        <Button variant="ghost" size="sm" className="w-fit gap-1" asChild>
          <Link to="/collections">
            <ArrowLeftIcon className="size-4" />
            {t('collectionDetail.back')}
          </Link>
        </Button>
        <EmptyState
          icon={FolderIcon}
          title={t('collectionDetail.notFoundTitle')}
          description={t('collectionDetail.notFoundDescription')}
        />
      </div>
    );
  }

  return (
    <div
      ref={setScrollElement}
      className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto"
    >
      <Button variant="ghost" size="sm" className="w-fit gap-1" asChild>
        <Link to="/collections">
          <ArrowLeftIcon className="size-4" />
          {t('collectionDetail.back')}
        </Link>
      </Button>

      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent">
          <FolderIcon className="size-6 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-page-title text-foreground tracking-tight">
            {collection.name}
          </h1>
          {collection.description ? (
            <p className="mt-1 text-[13px] text-muted-foreground leading-5">
              {collection.description}
            </p>
          ) : null}
          <p className="mt-2 text-caption text-muted-foreground">
            {t('collectionDetail.repoCount', { count })}
          </p>
        </div>
      </div>

      {memberRecords.length === 0 ? (
        <EmptyState
          icon={FolderIcon}
          title={t('collectionDetail.emptyTitle')}
          description={t('collectionDetail.emptyDescription')}
        />
      ) : (
        <RepoCollection
          records={memberRecords}
          view="list"
          tagsByRepo={tagsByRepo}
          selectedRepoId={selectedRepoId}
          onSelect={openInspector}
          scrollElement={scrollElement}
        />
      )}
    </div>
  );
}
