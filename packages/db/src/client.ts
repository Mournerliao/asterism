import { createClient, type SupabaseClient as SupabaseClientGeneric } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type SupabaseClient = SupabaseClientGeneric<Database>;

export interface SupabaseClientOptions {
  /** 是否持久化会话（默认 true，刷新/重开后保持登录态）。 */
  persistSession?: boolean;
  /** 是否自动刷新 token（默认 true）。 */
  autoRefreshToken?: boolean;
}

/**
 * 创建 Supabase 客户端（带 `Database` 泛型）。这是整个项目访问 Supabase 的唯一入口
 * （见 contracts/conventions.md 的目录边界）：其他包不得直连 Supabase 或自行拼 SQL。
 * 凭据由调用方从环境变量注入，绝不内联。
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options: SupabaseClientOptions = {},
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required to create a client');
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: options.persistSession ?? true,
      autoRefreshToken: options.autoRefreshToken ?? true,
    },
  });
}
