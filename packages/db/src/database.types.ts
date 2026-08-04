/**
 * 手写的 Supabase `Database` 类型，结构对齐 `supabase/migrations/`（snake_case 列）。
 * 待具备线上项目 / CLI 条件后，应以 `supabase gen types typescript` 重新生成覆盖本文件
 * （见 BACKLOG 与 decisions/0006）。
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type DbTable<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      repos: {
        Row: {
          id: string;
          github_id: number;
          full_name: string;
          name: string;
          owner: string;
          description: string | null;
          language: string | null;
          topics: string[];
          stargazers: number;
          forks: number | null;
          homepage: string | null;
          pushed_at: string | null;
          repo_created_at: string | null;
          archived: boolean;
          is_fork: boolean | null;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          github_id: number;
          full_name: string;
          name: string;
          owner: string;
          description?: string | null;
          language?: string | null;
          topics?: string[];
          stargazers?: number;
          forks?: number | null;
          homepage?: string | null;
          pushed_at?: string | null;
          repo_created_at?: string | null;
          archived?: boolean;
          is_fork?: boolean | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['repos']['Insert']>;
        Relationships: [];
      };
      user_stars: {
        Row: {
          id: string;
          user_id: string;
          repo_id: string;
          starred_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          repo_id: string;
          starred_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_stars']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_stars_repo_id_fkey';
            columns: ['repo_id'];
            isOneToOne: false;
            referencedRelation: 'repos';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
        Relationships: [];
      };
      repo_tags: {
        Row: {
          id: string;
          user_id: string;
          repo_id: string;
          tag_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          repo_id: string;
          tag_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['repo_tags']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'repo_tags_repo_id_fkey';
            columns: ['repo_id'];
            isOneToOne: false;
            referencedRelation: 'repos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'repo_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['collections']['Insert']>;
        Relationships: [];
      };
      collection_repos: {
        Row: {
          id: string;
          user_id: string;
          collection_id: string;
          repo_id: string;
          position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          collection_id: string;
          repo_id: string;
          position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['collection_repos']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'collection_repos_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_repos_repo_id_fkey';
            columns: ['repo_id'];
            isOneToOne: false;
            referencedRelation: 'repos';
            referencedColumns: ['id'];
          },
        ];
      };
      bulk_operations: {
        Row: {
          id: string;
          user_id: string;
          source: 'manual' | 'ai_draft' | 'promotion' | 'organization_task';
          source_draft_id: string | null;
          source_draft_revision: number | null;
          source_draft_suggestions: Json | null;
          source_repo_ids: string[];
          status: 'pending' | 'running' | 'needs_attention' | 'completed';
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: 'manual' | 'ai_draft' | 'promotion' | 'organization_task';
          source_draft_id?: string | null;
          source_draft_revision?: number | null;
          source_draft_suggestions?: Json | null;
          source_repo_ids: string[];
          status?: 'pending' | 'running' | 'needs_attention' | 'completed';
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bulk_operations']['Insert']>;
        Relationships: [];
      };
      bulk_operation_items: {
        Row: {
          id: string;
          user_id: string;
          operation_id: string;
          repo_id: string;
          relation_type: 'tag' | 'collection';
          target_id: string;
          action: 'add' | 'remove';
          status:
            | 'pending'
            | 'running'
            | 'succeeded'
            | 'retryable_failed'
            | 'terminal_failed'
            | 'dismissed';
          attempt_count: number;
          last_error_code: string | null;
          last_error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          operation_id: string;
          repo_id: string;
          relation_type: 'tag' | 'collection';
          target_id: string;
          action: 'add' | 'remove';
          status?:
            | 'pending'
            | 'running'
            | 'succeeded'
            | 'retryable_failed'
            | 'terminal_failed'
            | 'dismissed';
          attempt_count?: number;
          last_error_code?: string | null;
          last_error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bulk_operation_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'bulk_operation_items_operation_id_fkey';
            columns: ['operation_id'];
            isOneToOne: false;
            referencedRelation: 'bulk_operations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bulk_operation_items_repo_id_fkey';
            columns: ['repo_id'];
            isOneToOne: false;
            referencedRelation: 'repos';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          repo_id: string;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          repo_id: string;
          body?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notes_repo_id_fkey';
            columns: ['repo_id'];
            isOneToOne: false;
            referencedRelation: 'repos';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_provider_connections: {
        Row: {
          id: string;
          user_id: string;
          adapter: 'openai' | 'google' | 'anthropic' | 'openrouter' | 'openai-compatible';
          name: string;
          base_url: string | null;
          credential_ciphertext: string;
          credential_nonce: string;
          credential_version: number;
          credential_hint: string | null;
          status: 'untested' | 'valid' | 'invalid' | 'disabled';
          generation_capability: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          adapter: 'openai' | 'google' | 'anthropic' | 'openrouter' | 'openai-compatible';
          name: string;
          base_url?: string | null;
          credential_ciphertext: string;
          credential_nonce: string;
          credential_version?: number;
          credential_hint?: string | null;
          status?: 'untested' | 'valid' | 'invalid' | 'disabled';
          generation_capability?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_provider_connections']['Insert']>;
        Relationships: [];
      };
      ai_organization_drafts: {
        Row: {
          id: string;
          user_id: string;
          source_repo_ids: string[];
          suggestion_version: number;
          suggestions: Json;
          generation_connection_id: string;
          generation_adapter:
            | 'openai'
            | 'google'
            | 'anthropic'
            | 'openrouter'
            | 'openai-compatible';
          generation_model: string;
          review_state: 'review';
          revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_repo_ids: string[];
          suggestion_version?: number;
          suggestions: Json;
          generation_connection_id: string;
          generation_adapter:
            | 'openai'
            | 'google'
            | 'anthropic'
            | 'openrouter'
            | 'openai-compatible';
          generation_model: string;
          review_state?: 'review';
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_organization_drafts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'ai_organization_drafts_connection_fkey';
            columns: ['generation_connection_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'ai_provider_connections';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          generation_connection_id: string | null;
          generation_model: string | null;
          include_notes_in_ai: boolean;
          locale: 'en' | 'zh-CN' | null;
          theme: 'system' | 'light' | 'dark' | null;
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          generation_connection_id?: string | null;
          generation_model?: string | null;
          include_notes_in_ai?: boolean;
          locale?: 'en' | 'zh-CN' | null;
          theme?: 'system' | 'light' | 'dark' | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_settings_generation_connection_fkey';
            columns: ['generation_connection_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'ai_provider_connections';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      user_repo_embeddings: {
        Row: {
          id: string;
          user_id: string;
          repo_id: string;
          // pgvector `vector(384)` 经 PostgREST 以文本形式（'[..]'）往返；查询层做 number[] 互转。
          embedding: string;
          embedding_model: string;
          content_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          repo_id: string;
          embedding: string;
          embedding_model: string;
          content_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_repo_embeddings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_repo_embeddings_repo_id_fkey';
            columns: ['repo_id'];
            isOneToOne: false;
            referencedRelation: 'repos';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_opportunities: DbTable<
        {
          id: string;
          user_id: string;
          kind: 'initial_order' | 'new_stars';
          suggested_goal: string;
          repository_count: number;
          context_repo_ids: string[];
          status: 'available' | 'accepted' | 'ignored';
          accepted_task_id: string | null;
          sync_fingerprint: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          kind: 'initial_order' | 'new_stars';
          suggested_goal: string;
          repository_count: number;
          context_repo_ids?: string[];
          status?: 'available' | 'accepted' | 'ignored';
          accepted_task_id?: string | null;
          sync_fingerprint: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      organization_tasks: DbTable<
        {
          id: string;
          user_id: string;
          origin: 'direct_goal' | 'opportunity';
          opportunity_id: string | null;
          status:
            | 'clarifying'
            | 'discovering'
            | 'awaiting_generation_approval'
            | 'generation_approved'
            | 'generating'
            | 'generation_paused'
            | 'needs_attention'
            | 'plan_ready'
            | 'executing'
            | 'ended';
          goal: string;
          suggested_goal: string | null;
          context_repo_ids: string[];
          revision: number;
          current_snapshot_revision: number | null;
          current_manifest_fingerprint: string | null;
          attention_code: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          origin: 'direct_goal' | 'opportunity';
          opportunity_id?: string | null;
          status?:
            | 'clarifying'
            | 'discovering'
            | 'awaiting_generation_approval'
            | 'generation_approved'
            | 'generating'
            | 'generation_paused'
            | 'needs_attention'
            | 'plan_ready'
            | 'executing'
            | 'ended';
          goal: string;
          suggested_goal?: string | null;
          context_repo_ids?: string[];
          revision?: number;
          current_snapshot_revision?: number | null;
          current_manifest_fingerprint?: string | null;
          attention_code?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      organization_task_messages: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          role: 'user' | 'assistant' | 'checkpoint';
          text: string;
          checkpoint_type:
            | 'goal'
            | 'discovery'
            | 'generation_approval'
            | 'generation'
            | 'plan'
            | 'execution'
            | 'ended'
            | null;
          checkpoint_revision: number | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          role: 'user' | 'assistant' | 'checkpoint';
          text: string;
          checkpoint_type?:
            | 'goal'
            | 'discovery'
            | 'generation_approval'
            | 'generation'
            | 'plan'
            | 'execution'
            | 'ended'
            | null;
          checkpoint_revision?: number | null;
          created_at?: string;
        }
      >;
      organization_task_events: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          event_type: string;
          task_revision: number;
          payload: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          event_type: string;
          task_revision: number;
          payload?: Json;
          created_at?: string;
        }
      >;
      organization_candidate_snapshots: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          revision: number;
          discovery_version: string;
          library_count: number;
          candidate_count: number;
          fingerprint: string;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          revision: number;
          discovery_version: string;
          library_count: number;
          candidate_count: number;
          fingerprint: string;
          created_at?: string;
        }
      >;
      organization_candidate_items: DbTable<
        {
          id: string;
          user_id: string;
          snapshot_id: string;
          task_id: string;
          repo_id: string;
          content_fingerprint: string;
          included: boolean;
          reasons: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          snapshot_id: string;
          task_id: string;
          repo_id: string;
          content_fingerprint: string;
          included?: boolean;
          reasons: Json;
          created_at?: string;
        }
      >;
      organization_generation_manifests: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          snapshot_revision: number;
          fingerprint: string;
          candidate_count: number;
          page_count: number;
          max_initial_calls: number;
          max_retry_calls: number;
          max_total_calls: number;
          estimated_token_ceiling: number;
          connection_id: string;
          adapter: string;
          model: string;
          fields: string[];
          description_code_point_limit: number;
          note_code_point_limit: number;
          monetary_cost: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          snapshot_revision: number;
          fingerprint: string;
          candidate_count: number;
          page_count: number;
          max_initial_calls: number;
          max_retry_calls: number;
          max_total_calls: number;
          estimated_token_ceiling: number;
          connection_id: string;
          adapter: string;
          model: string;
          fields: string[];
          description_code_point_limit: number;
          note_code_point_limit: number;
          monetary_cost?: Json;
          created_at?: string;
        }
      >;
      organization_generation_manifest_pages: DbTable<
        {
          id: string;
          user_id: string;
          manifest_id: string;
          task_id: string;
          page_key: string;
          page_index: number;
          repo_ids: string[];
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          manifest_id: string;
          task_id: string;
          page_key: string;
          page_index: number;
          repo_ids: string[];
          created_at?: string;
        }
      >;
      organization_generation_approvals: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          task_revision: number;
          snapshot_revision: number;
          manifest_fingerprint: string;
          connection_id: string;
          adapter: string;
          model: string;
          fields: string[];
          description_code_point_limit: number;
          note_code_point_limit: number;
          max_initial_calls: number;
          max_retry_calls: number;
          max_total_calls: number;
          estimated_token_ceiling: number;
          approved_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          task_revision: number;
          snapshot_revision: number;
          manifest_fingerprint: string;
          connection_id: string;
          adapter: string;
          model: string;
          fields: string[];
          description_code_point_limit: number;
          note_code_point_limit: number;
          max_initial_calls: number;
          max_retry_calls: number;
          max_total_calls: number;
          estimated_token_ceiling: number;
          approved_at?: string;
        }
      >;
      organization_generation_page_runs: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          approval_id: string;
          page_key: string;
          page_index: number;
          repo_ids: string[];
          status: 'pending' | 'leased' | 'succeeded' | 'failed' | 'cancelled';
          attempt_count: number;
          lease_id: string | null;
          lease_expires_at: string | null;
          result: Json | null;
          error_code: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          approval_id: string;
          page_key: string;
          page_index: number;
          repo_ids: string[];
          status?: 'pending' | 'leased' | 'succeeded' | 'failed' | 'cancelled';
          attempt_count?: number;
          lease_id?: string | null;
          lease_expires_at?: string | null;
          result?: Json | null;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      organization_generation_calls: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          approval_id: string;
          page_run_id: string;
          page_key: string;
          attempt: number;
          lease_id: string;
          connection_id: string;
          adapter: string;
          model: string;
          request_schema: string;
          request_hash: string | null;
          fields: string[];
          truncation: Json | null;
          status: 'started' | 'succeeded' | 'failed' | 'lost';
          error_code: string | null;
          usage: Json | null;
          started_at: string;
          finished_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          approval_id: string;
          page_run_id: string;
          page_key: string;
          attempt: number;
          lease_id: string;
          connection_id: string;
          adapter: string;
          model: string;
          request_schema?: string;
          request_hash?: string | null;
          fields: string[];
          truncation?: Json | null;
          status?: 'started' | 'succeeded' | 'failed' | 'lost';
          error_code?: string | null;
          usage?: Json | null;
          started_at?: string;
          finished_at?: string | null;
        }
      >;
      organization_plans: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          revision: number;
          plan: Json;
          precondition_fingerprint: string;
          fingerprint: string;
          action_count: number;
          conflict_count: number;
          uncertainty_count: number;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          revision: number;
          plan: Json;
          precondition_fingerprint: string;
          fingerprint: string;
          action_count: number;
          conflict_count: number;
          uncertainty_count: number;
          created_at?: string;
        }
      >;
      organization_plan_action_exclusions: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          plan_revision: number;
          action_id: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          plan_revision: number;
          action_id: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      organization_plan_group_reviews: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          plan_revision: number;
          group_key: string;
          risk_type: 'existing_addition' | 'new_classification' | 'removal';
          group_fingerprint: string;
          approved: boolean;
          task_revision: number;
          reviewed_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          plan_revision: number;
          group_key: string;
          risk_type: 'existing_addition' | 'new_classification' | 'removal';
          group_fingerprint: string;
          approved: boolean;
          task_revision: number;
          reviewed_at?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      organization_task_operation_links: DbTable<
        {
          id: string;
          user_id: string;
          task_id: string;
          plan_revision: number;
          plan_fingerprint: string;
          operation_id: string;
          kind: 'execution';
          group_fingerprints: Json;
          confirmed_counts: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          plan_revision: number;
          plan_fingerprint: string;
          operation_id: string;
          kind: 'execution';
          group_fingerprints: Json;
          confirmed_counts: Json;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      replace_ai_organization_draft: {
        Args: {
          p_user_id: string;
          p_source_repo_ids: string[];
          p_suggestion_version: number;
          p_suggestions: Json;
          p_generation_connection_id: string;
          p_generation_adapter: string;
          p_generation_model: string;
        };
        Returns: Database['public']['Tables']['ai_organization_drafts']['Row'];
      };
      update_ai_organization_draft_review: {
        Args: {
          p_user_id: string;
          p_expected_revision: number;
          p_suggestions: Json;
        };
        Returns: Database['public']['Tables']['ai_organization_drafts']['Row'][];
      };
      confirm_ai_organization_draft: {
        Args: {
          p_user_id: string;
          p_draft_id: string;
          p_expected_revision: number;
          p_suggestions: Json;
        };
        Returns: string;
      };
      create_bulk_operation: {
        Args: {
          p_user_id: string;
          p_source: string;
          p_repo_ids: string[];
          p_changes: Json;
        };
        Returns: string;
      };
      claim_bulk_operation_items: {
        Args: { p_user_id: string; p_operation_id: string; p_statuses: string[] };
        Returns: Database['public']['Tables']['bulk_operation_items']['Row'][];
      };
      record_bulk_operation_item_result: {
        Args: {
          p_user_id: string;
          p_item_id: string;
          p_status: string;
          p_error_code?: string | null;
          p_error_message?: string | null;
        };
        Returns: undefined;
      };
      complete_bulk_operation: {
        Args: { p_user_id: string; p_operation_id: string };
        Returns: boolean;
      };
      search_user_repo_embeddings: {
        Args: { query_embedding: string; match_count?: number };
        Returns: { repo_id: string; distance: number }[];
      };
      save_organization_task_checkpoint: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_snapshot: Json;
          p_manifest: Json | null;
        };
        Returns: boolean;
      };
      create_organization_task: {
        Args: {
          p_user_id: string;
          p_goal: string;
          p_context_repo_ids: string[];
        };
        Returns: string;
      };
      accept_organization_opportunity_with_goal: {
        Args: {
          p_user_id: string;
          p_opportunity_id: string;
          p_goal: string;
        };
        Returns: string | null;
      };
      approve_organization_task_generation: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_manifest_fingerprint: string;
        };
        Returns: boolean;
      };
      update_organization_task_goal: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_goal: string;
          p_message: string | null;
        };
        Returns: boolean;
      };
      end_organization_task: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
        };
        Returns: boolean;
      };
      start_organization_generation: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
        };
        Returns: boolean;
      };
      pause_organization_generation: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
        };
        Returns: boolean;
      };
      resume_organization_generation: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
        };
        Returns: boolean;
      };
      retry_organization_generation: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
        };
        Returns: Json;
      };
      flag_organization_generation_attention: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_code: string;
        };
        Returns: boolean;
      };
      claim_organization_generation_page: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_lease_seconds: number;
        };
        Returns: Json;
      };
      complete_organization_generation_page: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_call_id: string;
          p_lease_id: string;
          p_status: string;
          p_request_hash: string | null;
          p_truncation: Json | null;
          p_usage: Json | null;
          p_error_code: string | null;
          p_result: Json | null;
        };
        Returns: Json;
      };
      save_organization_plan: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_plan: Json;
        };
        Returns: Json;
      };
      save_organization_plan_review: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_plan_revision: number;
          p_change: Json;
        };
        Returns: boolean;
      };
      confirm_organization_plan: {
        Args: {
          p_user_id: string;
          p_task_id: string;
          p_expected_revision: number;
          p_plan_revision: number;
          p_review: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
