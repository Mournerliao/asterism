import {
  buildExportPayload,
  type ExportSnapshot,
  normalizeImportData,
  parseImportJson,
  serializeExportCsv,
  serializeExportJson,
  serializeExportMarkdown,
} from '@asterism/core';
import { importUserData } from '@asterism/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import {
  collectionKeys,
  collectionRepoKeys,
  noteKeys,
  repoKeys,
  repoTagKeys,
  tagKeys,
} from './keys';

const NO_USER = 'NO_USER';

/** 导入 JSON 组织数据并刷新相关 Query。 */
export function useImportUserData() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (raw: string) => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      const { payload } = parseImportJson(raw);
      const normalized = normalizeImportData(payload);
      return importUserData(supabase, userId, normalized);
    },
    onSuccess: () => {
      if (!userId) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) });
      void queryClient.invalidateQueries({ queryKey: collectionKeys.list(userId) });
      void queryClient.invalidateQueries({ queryKey: repoTagKeys.list(userId) });
      void queryClient.invalidateQueries({ queryKey: collectionRepoKeys.list(userId) });
      void queryClient.invalidateQueries({ queryKey: noteKeys.all });
      void queryClient.invalidateQueries({ queryKey: repoKeys.starred(userId) });
    },
  });
}

export type ExportFormat = 'json' | 'csv' | 'markdown';

export function serializeExport(snapshot: ExportSnapshot, format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return serializeExportCsv(snapshot);
    case 'markdown':
      return serializeExportMarkdown(snapshot);
    default:
      return serializeExportJson(buildExportPayload(snapshot));
  }
}

export function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
