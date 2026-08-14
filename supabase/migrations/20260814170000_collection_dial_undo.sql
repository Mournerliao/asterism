-- Operation-scoped Collection Dial Undo with server-authoritative expiry (#33).

alter table public.bulk_operations
  add column undo_eligible_count integer not null default 0 check (undo_eligible_count >= 0),
  add column undo_skipped_count integer not null default 0 check (undo_skipped_count >= 0),
  add column undo_conflict_count integer not null default 0 check (undo_conflict_count >= 0),
  add column undo_expired boolean not null default false;

alter function public.apply_collection_relation_mutation(uuid, uuid, uuid, text, uuid)
  rename to apply_collection_relation_mutation_unchecked;

revoke all on function public.apply_collection_relation_mutation_unchecked(
  uuid, uuid, uuid, text, uuid
) from public, service_role;

create function public.apply_collection_relation_mutation(
  p_user_id uuid,
  p_collection_id uuid,
  p_repo_id uuid,
  p_action text,
  p_operation_item_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  undo_item public.bulk_operation_items%rowtype;
  undo_original_item public.bulk_operation_items%rowtype;
  relation_head public.collection_relation_heads%rowtype;
  mutation_result jsonb;
begin
  if p_operation_item_id is not null then
    select item.* into undo_item
    from public.bulk_operation_items item
    join public.bulk_operations operation on operation.id = item.operation_id
    where item.id = p_operation_item_id
      and item.user_id = p_user_id
      and operation.interaction = 'collection_dial_undo';
  end if;

  if undo_item.id is not null then
    if undo_item.effective_relation_version is not null then
      return public.apply_collection_relation_mutation_unchecked(
        p_user_id,
        p_collection_id,
        p_repo_id,
        p_action,
        p_operation_item_id
      );
    end if;

    select original_item.* into undo_original_item
    from public.bulk_operation_items undo_item
    join public.bulk_operations undo_operation on undo_operation.id = undo_item.operation_id
    join public.bulk_operation_items original_item
      on original_item.operation_id = undo_operation.undo_of_operation_id
      and original_item.user_id = undo_item.user_id
      and original_item.repo_id = undo_item.repo_id
      and original_item.relation_type = 'collection'
      and original_item.target_id = undo_item.target_id
      and original_item.action = 'add'
    where undo_item.id = p_operation_item_id
      and undo_item.user_id = p_user_id;

    select * into relation_head
    from public.collection_relation_heads head
    where head.user_id = p_user_id
      and head.collection_id = p_collection_id
      and head.repo_id = p_repo_id
    for update;

    if undo_original_item.id is null
      or undo_original_item.status <> 'succeeded'
      or not undo_original_item.effective_changed
      or relation_head.id is null
      or not relation_head.present
      or relation_head.effective_mutation_id is distinct from undo_original_item.effective_mutation_id
      or relation_head.version is distinct from undo_original_item.effective_relation_version
      or relation_head.last_operation_item_id is distinct from undo_original_item.id then
      raise exception 'undo_conflict';
    end if;
  end if;

  mutation_result := public.apply_collection_relation_mutation_unchecked(
    p_user_id,
    p_collection_id,
    p_repo_id,
    p_action,
    p_operation_item_id
  );

  if p_operation_item_id is not null
    and p_action = 'add'
    and (mutation_result->>'effectiveChanged')::boolean then
    update public.bulk_operations operation
    set undo_expires_at = coalesce(
      operation.undo_expires_at,
      statement_timestamp() + interval '30 seconds'
    )
    from public.bulk_operation_items item
    where item.id = p_operation_item_id
      and item.user_id = p_user_id
      and item.operation_id = operation.id
      and item.relation_type = 'collection'
      and item.action = 'add'
      and operation.interaction = 'collection_dial';
  end if;

  return mutation_result;
end;
$$;

create function public.create_collection_dial_undo(
  p_user_id uuid,
  p_operation_id uuid,
  p_client_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  original public.bulk_operations%rowtype;
  undo_operation public.bulk_operations%rowtype;
  effective_count integer;
  eligible_count integer := 0;
  conflict_count integer := 0;
  skipped_count integer := 0;
  inserted_count integer := 0;
  expired boolean := false;
begin
  select * into original
  from public.bulk_operations operation
  where operation.id = p_operation_id
    and operation.user_id = p_user_id
  for update;

  if original.id is null then
    return null;
  end if;
  if original.interaction <> 'collection_dial' or p_client_request_id is null then
    raise exception 'invalid_undo_request';
  end if;

  select * into undo_operation
  from public.bulk_operations operation
  where operation.undo_of_operation_id = original.id
  for update;

  if undo_operation.id is not null then
    if undo_operation.user_id <> p_user_id
      or undo_operation.client_request_id <> p_client_request_id then
      raise exception 'client_request_conflict';
    end if;
    return jsonb_build_object(
      'operationId', undo_operation.id,
      'eligibleCount', undo_operation.undo_eligible_count,
      'skippedCount', undo_operation.undo_skipped_count,
      'conflictCount', undo_operation.undo_conflict_count,
      'expired', undo_operation.undo_expired
    );
  end if;

  select count(*) into effective_count
  from public.bulk_operation_items item
  where item.operation_id = original.id
    and item.user_id = p_user_id
    and item.relation_type = 'collection'
    and item.action = 'add'
    and item.status = 'succeeded'
    and item.effective_changed;

  expired := original.undo_expires_at is null
    or statement_timestamp() > original.undo_expires_at;
  if not expired then
    select count(*) into eligible_count
    from public.bulk_operation_items item
    join public.collection_relation_heads head
      on head.user_id = item.user_id
      and head.collection_id = item.target_id
      and head.repo_id = item.repo_id
    join public.user_stars star
      on star.user_id = item.user_id and star.repo_id = item.repo_id
    join public.collections collection
      on collection.user_id = item.user_id and collection.id = item.target_id
    where item.operation_id = original.id
      and item.user_id = p_user_id
      and item.relation_type = 'collection'
      and item.action = 'add'
      and item.status = 'succeeded'
      and item.effective_changed
      and head.present
      and head.effective_mutation_id = item.effective_mutation_id
      and head.version = item.effective_relation_version
      and head.last_operation_item_id = item.id;

    select count(*) into conflict_count
    from public.bulk_operation_items item
    join public.collection_relation_heads head
      on head.user_id = item.user_id
      and head.collection_id = item.target_id
      and head.repo_id = item.repo_id
    where item.operation_id = original.id
      and item.user_id = p_user_id
      and item.relation_type = 'collection'
      and item.action = 'add'
      and item.status = 'succeeded'
      and item.effective_changed
      and (
        not head.present
        or head.effective_mutation_id is distinct from item.effective_mutation_id
        or head.version is distinct from item.effective_relation_version
        or head.last_operation_item_id is distinct from item.id
      );
  end if;
  skipped_count := cardinality(original.source_repo_ids) - eligible_count;

  insert into public.bulk_operations (
    user_id,
    source,
    interaction,
    client_request_id,
    undo_of_operation_id,
    source_repo_ids,
    status,
    completed_at,
    undo_eligible_count,
    undo_skipped_count,
    undo_conflict_count,
    undo_expired
  ) values (
    p_user_id,
    'manual',
    'collection_dial_undo',
    p_client_request_id,
    original.id,
    original.source_repo_ids,
    case when eligible_count = 0 then 'completed' else 'pending' end,
    case when eligible_count = 0 then statement_timestamp() else null end,
    eligible_count,
    skipped_count,
    conflict_count,
    expired
  ) returning * into undo_operation;

  if eligible_count > 0 then
    insert into public.bulk_operation_items (
      user_id, operation_id, repo_id, relation_type, target_id, action
    )
    select
      p_user_id,
      undo_operation.id,
      item.repo_id,
      'collection',
      item.target_id,
      'remove'
    from public.bulk_operation_items item
    join public.collection_relation_heads head
      on head.user_id = item.user_id
      and head.collection_id = item.target_id
      and head.repo_id = item.repo_id
    join public.user_stars star
      on star.user_id = item.user_id and star.repo_id = item.repo_id
    join public.collections collection
      on collection.user_id = item.user_id and collection.id = item.target_id
    where item.operation_id = original.id
      and item.user_id = p_user_id
      and item.relation_type = 'collection'
      and item.action = 'add'
      and item.status = 'succeeded'
      and item.effective_changed
      and head.present
      and head.effective_mutation_id = item.effective_mutation_id
      and head.version = item.effective_relation_version
      and head.last_operation_item_id = item.id;

    get diagnostics inserted_count = row_count;
    if inserted_count <> eligible_count then
      eligible_count := inserted_count;
      skipped_count := cardinality(original.source_repo_ids) - eligible_count;
      update public.bulk_operations
      set
        status = case when eligible_count = 0 then 'completed' else 'pending' end,
        completed_at = case when eligible_count = 0 then statement_timestamp() else null end,
        undo_eligible_count = eligible_count,
        undo_skipped_count = skipped_count
      where id = undo_operation.id and user_id = p_user_id;
    end if;
  end if;

  return jsonb_build_object(
    'operationId', undo_operation.id,
    'eligibleCount', eligible_count,
    'skippedCount', skipped_count,
    'conflictCount', conflict_count,
    'expired', expired
  );
end;
$$;

revoke all on function public.apply_collection_relation_mutation(
  uuid, uuid, uuid, text, uuid
) from public;
revoke all on function public.create_collection_dial_undo(uuid, uuid, uuid) from public;
grant execute on function public.apply_collection_relation_mutation(
  uuid, uuid, uuid, text, uuid
) to service_role;
grant execute on function public.create_collection_dial_undo(uuid, uuid, uuid) to service_role;
