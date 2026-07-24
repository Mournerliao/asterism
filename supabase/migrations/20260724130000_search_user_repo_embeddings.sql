-- Asterism · 隐形混合搜索的语义近邻检索（检索优先 derived 平面，ADR 0026 §7）
-- 浏览器本地把查询词嵌成向量后「只上送向量」；本函数在用户自己的向量上做距离检索，
-- 返回 (repo_id, distance)，交给客户端与关键词命中融合成单一排序。
-- security invoker + where user_id = auth.uid()：以调用者身份运行、RLS 亦生效，
-- 无跨用户泄露面，与 owner 直写路径同构（无需受信/definer 写入路径，ADR 0026 §4）。
-- 幂等：create or replace / 显式 grant，可重复执行。

-- pgvector 于 extensions schema 启用（见 initial_schema）；search_path='' 下算子需 schema 限定。
create extension if not exists "vector" with schema "extensions";

create or replace function public.search_user_repo_embeddings(
  query_embedding extensions.vector(384),
  match_count integer default 24
)
returns table (repo_id uuid, distance double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.repo_id,
    e.embedding OPERATOR(extensions.<=>) query_embedding as distance
  from public.user_repo_embeddings as e
  where e.user_id = (select auth.uid())
  order by e.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(coalesce(match_count, 24), 1), 200)
$$;

-- 仅登录用户可调用；函数体已按 auth.uid() 收窄，anon 调用得空集。
revoke all on function public.search_user_repo_embeddings(extensions.vector, integer) from public;
grant execute on function public.search_user_repo_embeddings(extensions.vector, integer) to authenticated;
