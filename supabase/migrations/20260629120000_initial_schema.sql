-- Asterism · 初始 schema（Phase 0 MVP）
-- 对齐 knowledge/contracts/data-model.md：repos 全局共享，用户私有数据按 user_id 隔离。
-- 幂等：使用 if not exists / create or replace，可重复执行。
-- 注意：RLS 策略在 20260629120100_row_level_security.sql 中单独启用。

-- 历史预启用：ADR 0022 已移除 Asterism 向量能力；保留已应用迁移，不自动删除可能被同项目其他对象使用的扩展。
create extension if not exists "vector" with schema "extensions";

-- 自动维护 updated_at 的触发器函数。
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- repos：仓库全局元数据（公共可读）
-- ---------------------------------------------------------------------------
create table if not exists public.repos (
  id uuid primary key default gen_random_uuid(),
  github_id bigint not null unique,
  full_name text not null,
  name text not null,
  owner text not null,
  description text,
  language text,
  topics text[] not null default '{}',
  stargazers integer not null default 0,
  forks integer,
  homepage text,
  pushed_at timestamptz,
  repo_created_at timestamptz,
  archived boolean not null default false,
  is_fork boolean,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repos_language_idx on public.repos (language);
create index if not exists repos_pushed_at_idx on public.repos (pushed_at desc);

create or replace trigger repos_set_updated_at
  before update on public.repos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_stars：用户的 star 关系
-- ---------------------------------------------------------------------------
create table if not exists public.user_stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  starred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repo_id)
);

create index if not exists user_stars_user_id_idx on public.user_stars (user_id);
create index if not exists user_stars_repo_id_idx on public.user_stars (repo_id);

create or replace trigger user_stars_set_updated_at
  before update on public.user_stars
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tags：用户自定义标签
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists tags_user_id_idx on public.tags (user_id);

create or replace trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- repo_tags：仓库↔标签连接表（多对多）
-- ---------------------------------------------------------------------------
create table if not exists public.repo_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repo_id, tag_id)
);

create index if not exists repo_tags_user_id_idx on public.repo_tags (user_id);
create index if not exists repo_tags_repo_id_idx on public.repo_tags (repo_id);
create index if not exists repo_tags_tag_id_idx on public.repo_tags (tag_id);

create or replace trigger repo_tags_set_updated_at
  before update on public.repo_tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- collections：用户集合
-- ---------------------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists collections_user_id_idx on public.collections (user_id);

create or replace trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- collection_repos：集合↔仓库连接表（多对多）
-- ---------------------------------------------------------------------------
create table if not exists public.collection_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, repo_id)
);

create index if not exists collection_repos_user_id_idx on public.collection_repos (user_id);
create index if not exists collection_repos_collection_id_idx on public.collection_repos (collection_id);
create index if not exists collection_repos_repo_id_idx on public.collection_repos (repo_id);

create or replace trigger collection_repos_set_updated_at
  before update on public.collection_repos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notes：仓库笔记（每用户每仓库一条）
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repo_id)
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_repo_id_idx on public.notes (repo_id);

create or replace trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();
