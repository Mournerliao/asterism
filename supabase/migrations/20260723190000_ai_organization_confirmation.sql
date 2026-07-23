-- Atomically consume one reviewed AI draft into the durable bulk-operation
-- ledger. Relationship execution remains in the existing bounded executor.

create function public.normalize_classification_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(regexp_replace(normalize(trim(value), NFKC), '[[:space:]]+', ' ', 'g'));
$$;

create function public.classification_name_near_key(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(
    public.normalize_classification_name(value),
    '[^[:alnum:]]+',
    '',
    'g'
  );
$$;

-- Earlier releases allowed names that differ only by case, Unicode form, or
-- whitespace. Merge those equivalent records before enforcing the stronger
-- invariant so upgrades remain deployable.
create temporary table ai_confirmation_tag_merge on commit drop as
select id as duplicate_id, canonical_id
from (
  select
    id,
    first_value(id) over (
      partition by user_id, public.normalize_classification_name(name)
      order by created_at, id
    ) as canonical_id
  from public.tags
) ranked
where id <> canonical_id;

insert into public.repo_tags (user_id, repo_id, tag_id, created_at, updated_at)
select relation.user_id, relation.repo_id, merge.canonical_id, relation.created_at, relation.updated_at
from public.repo_tags relation
join ai_confirmation_tag_merge merge on merge.duplicate_id = relation.tag_id
on conflict (user_id, repo_id, tag_id) do nothing;

with ranked_items as (
  select
    item.id,
    row_number() over (
      partition by
        item.operation_id,
        item.repo_id,
        item.relation_type,
        coalesce(merge.canonical_id, item.target_id),
        item.action
      order by
        case item.status
          when 'succeeded' then 0
          when 'dismissed' then 1
          when 'terminal_failed' then 2
          when 'retryable_failed' then 3
          when 'running' then 4
          else 5
        end,
        item.attempt_count desc,
        item.created_at,
        item.id
    ) as duplicate_rank
  from public.bulk_operation_items item
  left join ai_confirmation_tag_merge merge
    on item.relation_type = 'tag' and merge.duplicate_id = item.target_id
)
delete from public.bulk_operation_items item
using ranked_items
where item.id = ranked_items.id and ranked_items.duplicate_rank > 1;

update public.bulk_operation_items item
set target_id = merge.canonical_id
from ai_confirmation_tag_merge merge
where item.relation_type = 'tag' and item.target_id = merge.duplicate_id;

delete from public.tags tag
using ai_confirmation_tag_merge merge
where tag.id = merge.duplicate_id;

create temporary table ai_confirmation_collection_merge on commit drop as
select id as duplicate_id, canonical_id
from (
  select
    id,
    first_value(id) over (
      partition by user_id, public.normalize_classification_name(name)
      order by created_at, id
    ) as canonical_id
  from public.collections
) ranked
where id <> canonical_id;

insert into public.collection_repos (
  user_id,
  collection_id,
  repo_id,
  position,
  created_at,
  updated_at
)
select
  relation.user_id,
  merge.canonical_id,
  relation.repo_id,
  relation.position,
  relation.created_at,
  relation.updated_at
from public.collection_repos relation
join ai_confirmation_collection_merge merge
  on merge.duplicate_id = relation.collection_id
on conflict (collection_id, repo_id) do nothing;

with ranked_items as (
  select
    item.id,
    row_number() over (
      partition by
        item.operation_id,
        item.repo_id,
        item.relation_type,
        coalesce(merge.canonical_id, item.target_id),
        item.action
      order by
        case item.status
          when 'succeeded' then 0
          when 'dismissed' then 1
          when 'terminal_failed' then 2
          when 'retryable_failed' then 3
          when 'running' then 4
          else 5
        end,
        item.attempt_count desc,
        item.created_at,
        item.id
    ) as duplicate_rank
  from public.bulk_operation_items item
  left join ai_confirmation_collection_merge merge
    on item.relation_type = 'collection' and merge.duplicate_id = item.target_id
)
delete from public.bulk_operation_items item
using ranked_items
where item.id = ranked_items.id and ranked_items.duplicate_rank > 1;

update public.bulk_operation_items item
set target_id = merge.canonical_id
from ai_confirmation_collection_merge merge
where item.relation_type = 'collection' and item.target_id = merge.duplicate_id;

delete from public.collections collection
using ai_confirmation_collection_merge merge
where collection.id = merge.duplicate_id;

create unique index tags_user_normalized_name_idx
  on public.tags (user_id, public.normalize_classification_name(name));

create unique index collections_user_normalized_name_idx
  on public.collections (user_id, public.normalize_classification_name(name));

alter table public.bulk_operations
  add column source_draft_id uuid,
  add column source_draft_revision integer,
  add column source_draft_suggestions jsonb;

alter table public.bulk_operations
  add constraint bulk_operations_source_draft_payload_check
  check (
    source_draft_id is null
    or (source_draft_revision is not null and source_draft_suggestions is not null)
  );

create unique index bulk_operations_user_source_draft_idx
  on public.bulk_operations (user_id, source_draft_id)
  where source_draft_id is not null;

create function public.confirm_ai_organization_draft(
  p_user_id uuid,
  p_draft_id uuid,
  p_expected_revision integer,
  p_suggestions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.ai_organization_drafts%rowtype;
  confirmed_operation_id uuid;
  operation_revision integer;
  operation_suggestions jsonb;
  approved_classification jsonb;
  classification_targets jsonb := '{}'::jsonb;
  normalized_name text;
  target_id uuid;
  item_count integer;
begin
  select id, source_draft_revision, source_draft_suggestions
    into confirmed_operation_id, operation_revision, operation_suggestions
  from public.bulk_operations
  where user_id = p_user_id and source_draft_id = p_draft_id;

  if confirmed_operation_id is not null then
    if operation_revision is distinct from p_expected_revision
      or operation_suggestions is distinct from p_suggestions then
      raise exception using message = 'draft_confirmation_conflict', errcode = 'P0001';
    end if;
    return confirmed_operation_id;
  end if;

  select *
    into draft
  from public.ai_organization_drafts
  where id = p_draft_id and user_id = p_user_id
  for update;

  if not found then
    select id, source_draft_revision, source_draft_suggestions
      into confirmed_operation_id, operation_revision, operation_suggestions
    from public.bulk_operations
    where user_id = p_user_id and source_draft_id = p_draft_id;
    if confirmed_operation_id is not null then
      if operation_revision is distinct from p_expected_revision
        or operation_suggestions is distinct from p_suggestions then
        raise exception using message = 'draft_confirmation_conflict', errcode = 'P0001';
      end if;
      return confirmed_operation_id;
    end if;
    raise exception using message = 'draft_confirmation_conflict', errcode = 'P0001';
  end if;

  if draft.revision <> p_expected_revision or draft.suggestions <> p_suggestions then
    raise exception using message = 'draft_confirmation_conflict', errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.user_stars
    where user_id = p_user_id and repo_id = any(draft.source_repo_ids)
  ) <> cardinality(draft.source_repo_ids) then
    raise exception using message = 'draft_repository_invalid', errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_suggestions -> 'relationChanges') relation
    where
      relation ->> 'repoId' is null
      or not ((relation ->> 'repoId')::uuid = any(draft.source_repo_ids))
      or (
        (relation ->> 'selected')::boolean
        and not (
          case relation ->> 'relationType'
            when 'tag' then exists (
              select 1
              from public.tags
              where id = (relation ->> 'targetId')::uuid and user_id = p_user_id
            )
            when 'collection' then exists (
              select 1
              from public.collections
              where id = (relation ->> 'targetId')::uuid and user_id = p_user_id
            )
            else false
          end
        )
      )
  ) then
    raise exception using message = 'draft_target_invalid', errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_suggestions -> 'newClassifications') proposed
    where
      (proposed ->> 'approved')::boolean
      and public.classification_name_near_key(proposed ->> 'name') <> ''
      and (
        (
          proposed ->> 'relationType' = 'tag'
          and exists (
            select 1
            from public.tags existing
            where
              existing.user_id = p_user_id
              and public.classification_name_near_key(existing.name)
                = public.classification_name_near_key(proposed ->> 'name')
              and public.normalize_classification_name(existing.name)
                <> public.normalize_classification_name(proposed ->> 'name')
          )
        )
        or (
          proposed ->> 'relationType' = 'collection'
          and exists (
            select 1
            from public.collections existing
            where
              existing.user_id = p_user_id
              and public.classification_name_near_key(existing.name)
                = public.classification_name_near_key(proposed ->> 'name')
              and public.normalize_classification_name(existing.name)
                <> public.normalize_classification_name(proposed ->> 'name')
          )
        )
        or exists (
          select 1
          from jsonb_array_elements(p_suggestions -> 'newClassifications') peer
          where
            (peer ->> 'approved')::boolean
            and peer ->> 'id' <> proposed ->> 'id'
            and peer ->> 'relationType' = proposed ->> 'relationType'
            and public.classification_name_near_key(peer ->> 'name')
              = public.classification_name_near_key(proposed ->> 'name')
            and public.normalize_classification_name(peer ->> 'name')
              <> public.normalize_classification_name(proposed ->> 'name')
        )
      )
  ) then
    raise exception using message = 'draft_target_invalid', errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_suggestions -> 'newClassifications') classification_value
    where
      classification_value ->> 'relationType' not in ('tag', 'collection')
      or char_length(
        public.normalize_classification_name(classification_value ->> 'name')
      ) not between 1 and 100
      or exists (
        select 1
        from jsonb_array_elements_text(classification_value -> 'repoIds') repo_id
        where not (repo_id::uuid = any(draft.source_repo_ids))
      )
  ) then
    raise exception using message = 'draft_target_invalid', errcode = 'P0001';
  end if;

  select
    count(*) filter (
      where (relation ->> 'selected')::boolean
    )
    + coalesce(
      (
        select sum(jsonb_array_length(classification_value -> 'repoIds'))
        from jsonb_array_elements(p_suggestions -> 'newClassifications') classification_value
        where (classification_value ->> 'approved')::boolean
      ),
      0
    )
    into item_count
  from jsonb_array_elements(p_suggestions -> 'relationChanges') relation;

  if item_count = 0 or item_count > 10000 then
    raise exception using message = 'draft_confirmation_invalid', errcode = 'P0001';
  end if;

  for approved_classification in
    select classification_value
    from jsonb_array_elements(p_suggestions -> 'newClassifications') classification_value
    where (classification_value ->> 'approved')::boolean
  loop
    normalized_name := public.normalize_classification_name(approved_classification ->> 'name');
    if approved_classification ->> 'relationType' = 'tag' then
      insert into public.tags (user_id, name, color)
      values (
        p_user_id,
        regexp_replace(
          normalize(trim(approved_classification ->> 'name'), NFKC),
          '[[:space:]]+',
          ' ',
          'g'
        ),
        null
      )
      on conflict (user_id, (public.normalize_classification_name(name))) do nothing;

      select id
        into target_id
      from public.tags
      where
        user_id = p_user_id
        and public.normalize_classification_name(name) = normalized_name;
    else
      insert into public.collections (user_id, name, description)
      values (
        p_user_id,
        regexp_replace(
          normalize(trim(approved_classification ->> 'name'), NFKC),
          '[[:space:]]+',
          ' ',
          'g'
        ),
        null
      )
      on conflict (user_id, (public.normalize_classification_name(name))) do nothing;

      select id
        into target_id
      from public.collections
      where
        user_id = p_user_id
        and public.normalize_classification_name(name) = normalized_name;
    end if;

    if target_id is null then
      raise exception using message = 'draft_target_invalid', errcode = 'P0001';
    end if;
    classification_targets := jsonb_set(
      classification_targets,
      array[approved_classification ->> 'id'],
      to_jsonb(target_id::text)
    );
  end loop;

  insert into public.bulk_operations (
    user_id,
    source,
    source_draft_id,
    source_draft_revision,
    source_draft_suggestions,
    source_repo_ids
  )
  values (
    p_user_id,
    'ai_draft',
    p_draft_id,
    p_expected_revision,
    p_suggestions,
    draft.source_repo_ids
  )
  returning id into confirmed_operation_id;

  insert into public.bulk_operation_items (
    user_id,
    operation_id,
    repo_id,
    relation_type,
    target_id,
    action
  )
  select distinct
    p_user_id,
    confirmed_operation_id,
    item.repo_id,
    item.relation_type,
    item.target_id,
    item.action
  from (
    select
      (relation ->> 'repoId')::uuid as repo_id,
      relation ->> 'relationType' as relation_type,
      (relation ->> 'targetId')::uuid as target_id,
      relation ->> 'action' as action
    from jsonb_array_elements(p_suggestions -> 'relationChanges') relation
    where (relation ->> 'selected')::boolean

    union all

    select
      repo_id::uuid,
      classification ->> 'relationType',
      (classification_targets ->> (classification ->> 'id'))::uuid,
      'add'
    from jsonb_array_elements(p_suggestions -> 'newClassifications') classification
    cross join lateral jsonb_array_elements_text(classification -> 'repoIds') repo_id
    where (classification ->> 'approved')::boolean
  ) item;

  if not exists (
    select 1
    from public.bulk_operation_items
    where bulk_operation_items.operation_id = confirmed_operation_id
  ) then
    raise exception using message = 'draft_confirmation_invalid', errcode = 'P0001';
  end if;

  delete from public.ai_organization_drafts
  where id = p_draft_id and user_id = p_user_id;

  return confirmed_operation_id;
end;
$$;

revoke all on function public.normalize_classification_name(text) from public, anon;
grant execute on function public.normalize_classification_name(text) to authenticated, service_role;

revoke all on function public.classification_name_near_key(text) from public, anon;
grant execute on function public.classification_name_near_key(text) to service_role;

revoke all on function public.confirm_ai_organization_draft(
  uuid, uuid, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.confirm_ai_organization_draft(
  uuid, uuid, integer, jsonb
) to service_role;
