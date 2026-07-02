import type { NormalizedImportData } from '@asterism/core';
import type { SupabaseClient } from './client';
import { addRepoToCollection } from './queries/collection-repos';
import { createCollection, listCollections } from './queries/collections';
import { saveNote } from './queries/notes';
import { addRepoTag } from './queries/repo-tags';
import { listStarredRepos } from './queries/repos';
import { createTag, listTags } from './queries/tags';

export interface ImportUserDataResult {
  ok: boolean;
  imported: {
    tags: number;
    collections: number;
    repoTags: number;
    collectionRepos: number;
    notes: number;
  };
  skipped: string[];
  errors: string[];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

/**
 * 按依赖顺序导入组织数据（tags → collections → 关联 → notes）。
 * 仓库须已存在于 user_stars；按 fullName 匹配，无法匹配则跳过。
 */
export async function importUserData(
  client: SupabaseClient,
  userId: string,
  data: NormalizedImportData,
): Promise<ImportUserDataResult> {
  const skipped: string[] = [];
  const errors: string[] = [];
  const imported = {
    tags: 0,
    collections: 0,
    repoTags: 0,
    collectionRepos: 0,
    notes: 0,
  };

  const starred = await listStarredRepos(client, userId);
  const repoByFullName = new Map(
    starred.map((record) => [record.repo.fullName.toLowerCase(), record.repoId]),
  );

  const existingTags = await listTags(client, userId);
  const tagByName = new Map(existingTags.map((tag) => [normalizeName(tag.name), tag.id]));

  for (const tag of data.tags) {
    const key = normalizeName(tag.name);
    if (tagByName.has(key)) {
      skipped.push(`Tag exists: ${tag.name}`);
      continue;
    }
    try {
      const created = await createTag(client, {
        userId,
        name: tag.name,
        color: tag.color,
      });
      tagByName.set(key, created.id);
      imported.tags += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped.push(`Tag exists: ${tag.name}`);
      } else {
        errors.push(`Tag failed: ${tag.name}`);
      }
    }
  }

  const existingCollections = await listCollections(client, userId);
  const collectionByName = new Map(
    existingCollections.map((collection) => [normalizeName(collection.name), collection.id]),
  );

  for (const collection of data.collections) {
    const key = normalizeName(collection.name);
    if (collectionByName.has(key)) {
      skipped.push(`Collection exists: ${collection.name}`);
      continue;
    }
    try {
      const created = await createCollection(client, {
        userId,
        name: collection.name,
        description: collection.description,
      });
      collectionByName.set(key, created.id);
      imported.collections += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped.push(`Collection exists: ${collection.name}`);
      } else {
        errors.push(`Collection failed: ${collection.name}`);
      }
    }
  }

  for (const link of data.repoTags) {
    const repoId = repoByFullName.get(link.fullName.toLowerCase());
    const tagId = tagByName.get(normalizeName(link.tagName));
    if (!repoId) {
      skipped.push(`Repo not starred: ${link.fullName}`);
      continue;
    }
    if (!tagId) {
      skipped.push(`Tag missing: ${link.tagName}`);
      continue;
    }
    try {
      await addRepoTag(client, { userId, repoId, tagId });
      imported.repoTags += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped.push(`Repo tag exists: ${link.fullName} / ${link.tagName}`);
      } else {
        errors.push(`Repo tag failed: ${link.fullName} / ${link.tagName}`);
      }
    }
  }

  for (const link of data.collectionRepos) {
    const repoId = repoByFullName.get(link.fullName.toLowerCase());
    const collectionId = collectionByName.get(normalizeName(link.collectionName));
    if (!repoId) {
      skipped.push(`Repo not starred: ${link.fullName}`);
      continue;
    }
    if (!collectionId) {
      skipped.push(`Collection missing: ${link.collectionName}`);
      continue;
    }
    try {
      await addRepoToCollection(client, { userId, collectionId, repoId });
      imported.collectionRepos += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped.push(`Collection member exists: ${link.collectionName} / ${link.fullName}`);
      } else {
        errors.push(`Collection member failed: ${link.collectionName} / ${link.fullName}`);
      }
    }
  }

  for (const note of data.notes) {
    const repoId = repoByFullName.get(note.fullName.toLowerCase());
    if (!repoId) {
      skipped.push(`Repo not starred: ${note.fullName}`);
      continue;
    }
    try {
      await saveNote(client, { userId, repoId, body: note.body });
      imported.notes += 1;
    } catch {
      errors.push(`Note failed: ${note.fullName}`);
    }
  }

  return {
    ok: errors.length === 0,
    imported,
    skipped,
    errors,
  };
}
