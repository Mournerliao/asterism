import type {
  GenerationAdapterId,
  OrganizationGenerationInput,
  ValidatedOrganizationDraft,
} from '../../../packages/core/src/ai/generation-registry.ts';
import { resolveActiveGenerationModel } from '../../../packages/core/src/ai/generation-selection.ts';
import type { AiOrganizationDraftView } from './handler.ts';

export const AI_NOTE_CODE_POINT_LIMIT = 2_000;

export interface OrganizationContext {
  settings: {
    generationConnectionId: string | null;
    generationModel: string | null;
    includeNotesInAi: boolean;
  };
  connection: {
    id: string;
    adapter: GenerationAdapterId;
    baseUrl: string | null;
    status: 'untested' | 'valid' | 'invalid' | 'disabled';
    capability: unknown;
  } | null;
  repositories: Array<{
    id: string;
    fullName: string;
    description: string | null;
    language: string | null;
    topics: string[];
  }>;
  tags: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  repoTags: Array<{ repoId: string; tagId: string }>;
  collectionRepos: Array<{ repoId: string; collectionId: string }>;
  notes: Array<{ repoId: string; body: string }>;
}

export interface AiOrganizationServiceDependencies {
  loadContext: (userId: string, repoIds: string[]) => Promise<OrganizationContext>;
  readCredential: (userId: string, connectionId: string) => Promise<string | null>;
  callProvider: (target: {
    adapter: GenerationAdapterId;
    baseUrl: string | null;
    credential: { apiKey: string };
    model: string;
    input: OrganizationGenerationInput;
  }) => Promise<ValidatedOrganizationDraft>;
  replaceDraft: (input: {
    userId: string;
    repoIds: string[];
    connectionId: string;
    adapter: GenerationAdapterId;
    model: string;
    suggestions: ValidatedOrganizationDraft;
  }) => Promise<AiOrganizationDraftView>;
  getDraft: (userId: string) => Promise<AiOrganizationDraftView | null>;
  discardDraft: (userId: string) => Promise<boolean>;
}

function truncateCodePoints(value: string): string {
  return Array.from(value).slice(0, AI_NOTE_CODE_POINT_LIMIT).join('');
}

function indexValues<T extends { repoId: string }>(
  values: T[],
  select: (value: T) => string,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const value of values) {
    const current = result.get(value.repoId) ?? [];
    current.push(select(value));
    result.set(value.repoId, current);
  }
  return result;
}

export function createAiOrganizationService(dependencies: AiOrganizationServiceDependencies) {
  return {
    getDraft: dependencies.getDraft,
    discardDraft: dependencies.discardDraft,
    async generateDraft(userId: string, repoIds: string[]): Promise<AiOrganizationDraftView> {
      if (repoIds.length === 0 || repoIds.length > 50 || new Set(repoIds).size !== repoIds.length) {
        throw new Error('invalid_repository_scope');
      }
      const context = await dependencies.loadContext(userId, repoIds);
      const authoritativeIds = new Set(context.repositories.map((repo) => repo.id));
      if (
        authoritativeIds.size !== repoIds.length ||
        repoIds.some((repoId) => !authoritativeIds.has(repoId))
      ) {
        throw new Error('repository_not_owned');
      }
      const connection = context.connection;
      if (
        !connection ||
        connection.id !== context.settings.generationConnectionId ||
        !context.settings.generationModel
      ) {
        throw new Error('generation_connection_required');
      }
      const selection = resolveActiveGenerationModel(
        { status: connection.status, capability: connection.capability },
        context.settings.generationModel,
      );
      if (!selection.ok || selection.model !== context.settings.generationModel) {
        throw new Error('generation_connection_not_valid');
      }

      const credential = await dependencies.readCredential(userId, connection.id);
      if (!credential) throw new Error('generation_connection_not_valid');
      const tagsByRepo = indexValues(context.repoTags, (link) => link.tagId);
      const collectionsByRepo = indexValues(context.collectionRepos, (link) => link.collectionId);
      const notesByRepo = new Map(context.notes.map((note) => [note.repoId, note.body]));
      const input: OrganizationGenerationInput = {
        repositories: context.repositories.map((repo) => {
          const note = context.settings.includeNotesInAi ? notesByRepo.get(repo.id) : undefined;
          return {
            ...repo,
            existingTagIds: tagsByRepo.get(repo.id) ?? [],
            existingCollectionIds: collectionsByRepo.get(repo.id) ?? [],
            ...(note === undefined ? {} : { note: truncateCodePoints(note) }),
          };
        }),
        tags: context.tags,
        collections: context.collections,
      };
      const suggestions = await dependencies.callProvider({
        adapter: connection.adapter,
        baseUrl: connection.baseUrl,
        credential: { apiKey: credential },
        model: selection.model,
        input,
      });
      return dependencies.replaceDraft({
        userId,
        repoIds: [...repoIds],
        connectionId: connection.id,
        adapter: connection.adapter,
        model: selection.model,
        suggestions,
      });
    },
  };
}
