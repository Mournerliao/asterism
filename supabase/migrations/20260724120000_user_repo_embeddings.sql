-- Asterism · user_repo_embeddings（检索优先 derived 平面，ADR 0026）
-- 浏览器内 embedding 产出的仓库语义向量，按用户存储、客户端经普通 RLS 直写。
-- derived 数据：可随模型升级重算、永不写入 canonical；与 notes 表同构。
-- 幂等：if not exists / create or replace / drop policy if exists，可重复执行。

-- pgvector 已在 20260629120000_initial_schema.sql 于 extensions schema 启用；此处再确认一次，保证本迁移独立可跑。
create extension if not exists "vector" with schema "extensions";

-- ---------------------------------------------------------------------------
-- user_repo_embeddings：仓库语义向量（按用户存储；derived、可重算）
-- 维度 384 = 默认模型 multilingual-e5-small；维度随默认模型变化需 alter + 全库重嵌。
-- 先不建 ANN 索引（HNSW / IVFFlat 留待规模变大）：个人量级按 user_id 过滤后精确扫描即毫秒级。
-- ---------------------------------------------------------------------------
create table if not exists public.user_repo_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  embedding extensions.vector(384) not null,
  embedding_model text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repo_id)
);

create index if not exists user_repo_embeddings_user_id_idx on public.user_repo_embeddings (user_id);
create index if not exists user_repo_embeddings_repo_id_idx on public.user_repo_embeddings (repo_id);

create or replace trigger user_repo_embeddings_set_updated_at
  before update on public.user_repo_embeddings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS：与 notes 同构——本人可 select / insert / update / delete（user_id = auth.uid()）。
-- 因此浏览器直接经普通 RLS upsert 自己的行，无需受信写入路径，也没有跨用户投毒面。
-- ---------------------------------------------------------------------------
alter table public.user_repo_embeddings enable row level security;

drop policy if exists "user_repo_embeddings_owner_all" on public.user_repo_embeddings;
create policy "user_repo_embeddings_owner_all" on public.user_repo_embeddings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
