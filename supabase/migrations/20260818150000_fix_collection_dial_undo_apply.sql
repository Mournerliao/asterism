-- Undo apply used the rowtype variable name `undo_item` as a SQL table alias.
-- Real Postgres substitutes PL/pgSQL variables into that query, so the original
-- receipt lookup can fail before the head/receipt conflict guard. Rename the
-- aliases so Collection Dial Undo can actually remove the matching membership.

create or replace function public.apply_collection_relation_mutation(
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
  current_undo_item public.bulk_operation_items%rowtype;
  original_add_item public.bulk_operation_items%rowtype;
  relation_head public.collection_relation_heads%rowtype;
  mutation_result jsonb;
begin
  if p_operation_item_id is not null then
    select item.* into current_undo_item
    from public.bulk_operation_items item
    join public.bulk_operations operation on operation.id = item.operation_id
    where item.id = p_operation_item_id
      and item.user_id = p_user_id
      and operation.interaction = 'collection_dial_undo';
  end if;

  if current_undo_item.id is not null then
    if current_undo_item.effective_relation_version is not null then
      return public.apply_collection_relation_mutation_unchecked(
        p_user_id,
        p_collection_id,
        p_repo_id,
        p_action,
        p_operation_item_id
      );
    end if;

    select original_item.* into original_add_item
    from public.bulk_operation_items undo_item_row
    join public.bulk_operations undo_operation
      on undo_operation.id = undo_item_row.operation_id
    join public.bulk_operation_items original_item
      on original_item.operation_id = undo_operation.undo_of_operation_id
      and original_item.user_id = undo_item_row.user_id
      and original_item.repo_id = undo_item_row.repo_id
      and original_item.relation_type = 'collection'
      and original_item.target_id = undo_item_row.target_id
      and original_item.action = 'add'
    where undo_item_row.id = p_operation_item_id
      and undo_item_row.user_id = p_user_id;

    select * into relation_head
    from public.collection_relation_heads head
    where head.user_id = p_user_id
      and head.collection_id = p_collection_id
      and head.repo_id = p_repo_id
    for update;

    if original_add_item.id is null
      or original_add_item.status <> 'succeeded'
      or not original_add_item.effective_changed
      or relation_head.id is null
      or not relation_head.present
      or relation_head.effective_mutation_id is distinct from original_add_item.effective_mutation_id
      or relation_head.version is distinct from original_add_item.effective_relation_version
      or relation_head.last_operation_item_id is distinct from original_add_item.id then
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
