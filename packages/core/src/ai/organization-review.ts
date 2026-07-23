import type { OrganizationAction, OrganizationRelationType } from './generation-registry';

export type AiOrganizationReviewChange =
  | { kind: 'relation'; suggestionId: string; selected: boolean }
  | { kind: 'classification'; suggestionId: string; approved: boolean };

export interface AiOrganizationReviewSuggestions {
  version: 2;
  relationChanges: Array<{
    id: string;
    repoId: string;
    relationType: OrganizationRelationType;
    action: OrganizationAction;
    targetId: string;
    selected: boolean;
  }>;
  newClassifications: Array<{
    id: string;
    relationType: OrganizationRelationType;
    name: string;
    repoIds: string[];
    approved: boolean;
  }>;
}

export interface AiOrganizationDraft {
  id: string;
  sourceRepoIds: string[];
  suggestions: AiOrganizationReviewSuggestions;
  generationConnectionId: string;
  generationAdapter: string;
  generationModel: string;
  reviewState: 'review';
  revision: number;
  createdAt: string;
  updatedAt: string;
}
