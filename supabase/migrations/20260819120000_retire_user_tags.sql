-- ADR 0035: retire user tags into collections, then drop tags / repo_tags.
-- Historical bulk_operation_items.relation_type = 'tag' rows are kept as ledger facts.
-- New operations only accept relation_type = 'collection'.

create or replace function public.create_bulk_operation(
  p_user_id uuid,
  p_source text,
  p_interaction text,
  p_client_request_id uuid,
  p_repo_ids uuid[],
  p_item_repo_ids uuid[],
  p_changes jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_id uuid;
  normalized_repo_ids uuid[];
  normalized_item_repo_ids uuid[];
  change_count integer;
begin
  if p_source <> 'manual'
    or p_interaction not in ('bulk_dialog', 'collection_dial')
    or p_client_request_id is null
    or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'invalid_bulk_request';
  end if;

  select array_agg(repo_id order by ordinal)
    into normalized_repo_ids
  from (
    select repo_id, min(ordinal) as ordinal
    from unnest(p_repo_ids) with ordinality as selected(repo_id, ordinal)
    group by repo_id
  ) stable_scope;

  select array_agg(repo_id order by ordinal)
    into normalized_item_repo_ids
  from (
    select repo_id, min(ordinal) as ordinal
    from unnest(p_item_repo_ids) with ordinality as selected(repo_id, ordinal)
    group by repo_id
  ) stable_item_scope;

  select count(*) into change_count from jsonb_array_elements(p_changes);
  if coalesce(cardinality(normalized_repo_ids), 0) = 0
    or coalesce(cardinality(normalized_item_repo_ids), 0) = 0
    or change_count = 0
    or cardinality(normalized_item_repo_ids) * change_count > 10000
    or exists (
      select 1 from unnest(normalized_item_repo_ids) item_repo_id
      where not (item_repo_id = any(normalized_repo_ids))
    ) then
    raise exception 'invalid_bulk_request';
  end if;

  if (
    select count(*) from public.user_stars
    where user_id = p_user_id and repo_id = any(normalized_repo_ids)
  ) <> cardinality(normalized_repo_ids) then
    raise exception 'repository_not_owned';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) change
    where change->>'relationType' <> 'collection'
      or change->>'action' not in ('add', 'remove')
      or not exists (
        select 1 from public.collections
        where id = (change->>'targetId')::uuid and user_id = p_user_id
      )
  ) then
    raise exception 'target_not_owned';
  end if;

  insert into public.bulk_operations (
    user_id,
    source,
    interaction,
    client_request_id,
    source_repo_ids
  ) values (
    p_user_id,
    p_source,
    p_interaction,
    p_client_request_id,
    normalized_repo_ids
  )
  on conflict (user_id, client_request_id) do nothing
  returning id into operation_id;

  if operation_id is null then
    select operation.id into operation_id
    from public.bulk_operations operation
    where operation.user_id = p_user_id
      and operation.client_request_id = p_client_request_id
      and operation.source = p_source
      and operation.interaction = p_interaction
      and operation.source_repo_ids = normalized_repo_ids
      and (
        select count(*)
        from public.bulk_operation_items item
        where item.operation_id = operation.id
      ) = cardinality(normalized_item_repo_ids) * change_count
      and not exists (
        select 1
        from unnest(normalized_item_repo_ids) repo_id
        cross join jsonb_array_elements(p_changes) change
        where not exists (
          select 1
          from public.bulk_operation_items item
          where item.operation_id = operation.id
            and item.repo_id = repo_id
            and item.relation_type = change->>'relationType'
            and item.target_id = (change->>'targetId')::uuid
            and item.action = change->>'action'
        )
      );

    if operation_id is null then
      raise exception 'client_request_conflict';
    end if;
    return operation_id;
  end if;

  insert into public.bulk_operation_items (
    user_id, operation_id, repo_id, relation_type, target_id, action
  )
  select distinct
    p_user_id,
    operation_id,
    repo_id,
    change->>'relationType',
    (change->>'targetId')::uuid,
    change->>'action'
  from unnest(normalized_item_repo_ids) repo_id
  cross join jsonb_array_elements(p_changes) change;

  return operation_id;
end;
$$;

create temporary table _tag_collection_map (
  tag_id uuid primary key,
  collection_id uuid not null
) on commit drop;

insert into _tag_collection_map (tag_id, collection_id)
select tag.id, collection.id
from public.tags tag
join public.collections collection
  on collection.user_id = tag.user_id
 and public.normalize_classification_name(collection.name)
   = public.normalize_classification_name(tag.name);

insert into public.collections (user_id, name, description)
select tag.user_id, tag.name, null
from public.tags tag
where not exists (
  select 1 from _tag_collection_map mapped where mapped.tag_id = tag.id
);

insert into _tag_collection_map (tag_id, collection_id)
select tag.id, collection.id
from public.tags tag
join public.collections collection
  on collection.user_id = tag.user_id
 and public.normalize_classification_name(collection.name)
   = public.normalize_classification_name(tag.name)
where not exists (
  select 1 from _tag_collection_map mapped where mapped.tag_id = tag.id
);

insert into public.collection_repos (user_id, collection_id, repo_id)
select distinct
  relation.user_id,
  mapped.collection_id,
  relation.repo_id
from public.repo_tags relation
join _tag_collection_map mapped on mapped.tag_id = relation.tag_id
on conflict (collection_id, repo_id) do nothing;

insert into public.collection_relation_heads (
  user_id,
  collection_id,
  repo_id,
  present,
  version,
  effective_mutation_id,
  last_operation_item_id
)
select
  relation.user_id,
  relation.collection_id,
  relation.repo_id,
  true,
  1,
  gen_random_uuid(),
  null
from public.collection_repos relation
on conflict (user_id, collection_id, repo_id) do nothing;

drop table if exists public.repo_tags;
drop table if exists public.tags;
