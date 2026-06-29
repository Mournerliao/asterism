-- Asterism · 行级安全（RLS）
-- 对齐 knowledge/contracts/data-model.md：repos 全局可读，其余表按 user_id 隔离。
-- 性能：策略中以 (select auth.uid()) 形式调用，避免逐行重复求值。
-- 幂等：每条策略先 drop if exists 再 create，可重复执行。

-- 启用 RLS。
alter table public.repos enable row level security;
alter table public.user_stars enable row level security;
alter table public.tags enable row level security;
alter table public.repo_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_repos enable row level security;
alter table public.notes enable row level security;

-- ---------------------------------------------------------------------------
-- repos：所有已认证用户可读；写入仅限受信路径（service role 绕过 RLS）。
-- ---------------------------------------------------------------------------
drop policy if exists "repos_select_authenticated" on public.repos;
create policy "repos_select_authenticated" on public.repos
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 用户私有表：仅本人可增删改查（user_id = auth.uid()）。
-- ---------------------------------------------------------------------------
drop policy if exists "user_stars_owner_all" on public.user_stars;
create policy "user_stars_owner_all" on public.user_stars
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tags_owner_all" on public.tags;
create policy "tags_owner_all" on public.tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "repo_tags_owner_all" on public.repo_tags;
create policy "repo_tags_owner_all" on public.repo_tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "collections_owner_all" on public.collections;
create policy "collections_owner_all" on public.collections
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "collection_repos_owner_all" on public.collection_repos;
create policy "collection_repos_owner_all" on public.collection_repos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all" on public.notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
