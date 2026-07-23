-- The initial confirmation function reused PL/pgSQL variable names as SQL
-- aliases or column names. Real Postgres resolves those references as
-- ambiguous when the item insert is first planned. Replace them with
-- unambiguous variable names.

create or replace function public.confirm_ai_organization_draft(
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
