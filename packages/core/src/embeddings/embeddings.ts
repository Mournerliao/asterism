import type { RepoId } from '../models/repo';

/**
 * 默认浏览器内 embedding 模型 ID（ADR 0026 §3）。
 * 全局钉死、可版本化：升级 / 更换模型即改此常量，各客户端据向量行的 `embedding_model`
 * 失配惰性重嵌。此路可逆，故现在选轻量模型是安全的。
 */
export const DEFAULT_EMBEDDING_MODEL = 'multilingual-e5-small';

/**
 * 默认模型的向量维度（e5-small = 384）。与迁移 `user_repo_embeddings.embedding` 的
 * `vector(384)` 对齐；维度随默认模型变化需 `alter` + 全库重嵌（属版本升级成本）。
 */
export const DEFAULT_EMBEDDING_DIMENSIONS = 384;

/**
 * 参与语义嵌入的仓库字段：仅公共元数据（`full_name` + `description` + `topics`），
 * 绝不含笔记等用户私有内容。
 */
export interface EmbeddableRepo {
  fullName: string;
  description: string | null;
  topics: string[];
}

/**
 * 组装被嵌文本（ADR 0026 §3）：`full_name` + `description` + `topics`。
 * 确定性：同一输入恒定产出，供 content-hash 与嵌入运行时共用。
 * 不加 e5 的 `query:` / `passage:` 前缀——前缀是嵌入运行时（检索 / 回填）的关注点，
 * 与内容无关，不进哈希。
 */
export function embeddableRepoText(repo: EmbeddableRepo): string {
  const segments = [repo.fullName.trim()];

  const description = repo.description?.trim();
  if (description) {
    segments.push(description);
  }

  const topics = repo.topics.map((topic) => topic.trim()).filter((topic) => topic.length > 0);
  if (topics.length > 0) {
    segments.push(topics.join(' '));
  }

  return segments.join('\n');
}

/**
 * 被嵌文本的内容哈希（FNV-1a 64-bit，定长十六进制）。
 * 用途是探测「被嵌文本是否变化」以触发增量重嵌，非安全用途；同步、确定性、无依赖，
 * 在浏览器与 Node 产出一致（按 UTF-16 code unit 混入，多语言文本亦确定）。
 */
export function computeContentHash(text: string): string {
  const OFFSET_BASIS = 0xcbf29ce484222325n;
  const PRIME = 0x100000001b3n;
  const MASK_64 = 0xffffffffffffffffn;

  let hash = OFFSET_BASIS;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}

/** 仓库被嵌文本的内容哈希：`embeddableRepoText` → `computeContentHash` 的便捷组合。 */
export function repoContentHash(repo: EmbeddableRepo): string {
  return computeContentHash(embeddableRepoText(repo));
}

/** 某仓库进入「待嵌集合」的原因。 */
export type EmbeddingStalenessReason = 'missing' | 'model_mismatch' | 'content_mismatch';

/** 期望被嵌的仓库（携带当前被嵌文本的内容哈希）。 */
export interface DesiredRepoEmbedding {
  repoId: RepoId;
  contentHash: string;
}

/** 已存储向量的元数据（探测过期所需的最小字段，不含向量本身）。 */
export interface StoredRepoEmbedding {
  repoId: RepoId;
  embeddingModel: string;
  contentHash: string;
}

/** 待嵌集合中的一项：仓库 ID + 触发（重）嵌的原因。 */
export interface RepoEmbeddingBackfillItem {
  repoId: RepoId;
  reason: EmbeddingStalenessReason;
}

/**
 * 求「待嵌集合」（ADR 0026 §6）：某仓库需要（重）嵌，当且仅当
 * 无行 / `embedding_model` ≠ 当前模型 / `content_hash` ≠ 当前文本哈希。
 *
 * 纯函数、天然增量、可续跑：sync 后新增仓库自动入集合（无行）；模型升级令全库
 * `embedding_model` 失配从而惰性重嵌。已存储但已不在期望集合中的向量不予处理
 * （删除随 star 关系级联，不属回填职责）。
 */
export function selectReposToEmbed(input: {
  model: string;
  desired: readonly DesiredRepoEmbedding[];
  stored: readonly StoredRepoEmbedding[];
}): RepoEmbeddingBackfillItem[] {
  const storedByRepo = new Map<RepoId, StoredRepoEmbedding>();
  for (const row of input.stored) {
    storedByRepo.set(row.repoId, row);
  }

  const items: RepoEmbeddingBackfillItem[] = [];
  for (const repo of input.desired) {
    const existing = storedByRepo.get(repo.repoId);
    if (!existing) {
      items.push({ repoId: repo.repoId, reason: 'missing' });
    } else if (existing.embeddingModel !== input.model) {
      items.push({ repoId: repo.repoId, reason: 'model_mismatch' });
    } else if (existing.contentHash !== repo.contentHash) {
      items.push({ repoId: repo.repoId, reason: 'content_mismatch' });
    }
  }
  return items;
}
