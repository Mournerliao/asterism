/**
 * 手写的 Supabase `Database` 类型，结构对齐 `supabase/migrations/`（snake_case 列）。
 * 待具备线上项目 / CLI 条件后，应以 `supabase gen types typescript` 重新生成覆盖本文件
 * （见 BACKLOG 与 decisions/0006）。
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          source: 'manual' | 'ai_draft';
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
          source: 'manual' | 'ai_draft';
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
