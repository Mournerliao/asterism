import { deleteAllRepoEmbeddings } from '@asterism/db';
import { supabase } from '../lib/supabase';

const OPT_IN_KEY_PREFIX = 'asterism:embedding-bootstrap:';
const MODEL_CACHE_PATTERN = /transformers|onnx|model/i;

/**
 * 开发期重置智能搜索的全部三层状态（远端向量行 / opt-in 标记 / 模型缓存），
 * 让准备流程回到 idle 起点，供反复打磨准备期 UI/UX。仅 DEV 构建经动态 import
 * 加载，生产包不含本模块。
 */
export async function resetSmartSearchState(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    await deleteAllRepoEmbeddings(supabase, session.user.id);
    console.info('[reset-smart-search] Deleted user_repo_embeddings rows for current user');
  } else {
    console.warn('[reset-smart-search] No session; skipped remote embedding rows');
  }

  const optInKeys = Object.keys(localStorage).filter((key) => key.startsWith(OPT_IN_KEY_PREFIX));
  for (const key of optInKeys) {
    localStorage.removeItem(key);
  }
  console.info(`[reset-smart-search] Removed ${optInKeys.length} opt-in key(s)`);

  if ('caches' in globalThis) {
    for (const name of await caches.keys()) {
      if (MODEL_CACHE_PATTERN.test(name)) {
        await caches.delete(name);
        console.info(`[reset-smart-search] Deleted cache "${name}"`);
      }
    }
  }

  window.history.replaceState(null, '', window.location.pathname);
  console.info('[reset-smart-search] Done — smart search is back to the idle state');
}
