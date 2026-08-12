-- Trusted collection relationship mutations and durable receipts (ADR 0034, #30).

alter table public.bulk_operations
  add column interaction text not null default 'bulk_dialog'
    check (interaction in ('bulk_dialog', 'collection_dial', 'collection_dial_undo')),
  add column client_request_id uuid not null default gen_random_uuid(),
  add column undo_of_operation_id uuid references public.bulk_operations(id) on delete restrict,
  add column undo_expires_at timestamptz;

create unique index bulk_operations_user_client_request_idx
  on public.bulk_operations (user_id, client_request_id);

create unique index bulk_operations_undo_of_operation_idx
  on public.bulk_operations (undo_of_operation_id)
  where undo_of_operation_id is not null;

alter table public.bulk_operations
  add constraint bulk_operations_undo_shape_check check (
    (interaction = 'collection_dial_undo' and undo_of_operation_id is not null)
    or (interaction <> 'collection_dial_undo' and undo_of_operation_id is null)
  );

alter table public.bulk_operation_items
  add column effective_changed boolean not null default false,
  add column effective_mutation_id uuid,
  add column effective_relation_version bigint check (effective_relation_version >= 0);

alter table public.bulk_operation_items
  add constraint bulk_operation_items_effective_receipt_check check (
    effective_changed or effective_mutation_id is null
  );

create table public.collection_relation_heads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  repo_id uuid not null references public.repos(id) on delete cascade,
  present boolean not null,
  version bigint not null check (version >= 0),
  effective_mutation_id uuid,
  last_operation_item_id uuid references public.bulk_operation_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, collection_id, repo_id),
  check (
    (version = 0 and effective_mutation_id is null)
    or (version > 0 and effective_mutation_id is not null)
  )
);

create index collection_relation_heads_user_repo_idx
  on public.collection_relation_heads (user_id, repo_id);

create trigger collection_relation_heads_set_updated_at
  before update on public.collection_relation_heads
  for each row execute function public.set_updated_at();

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

alter table public.collection_relation_heads enable row level security;

create policy "collection_relation_heads_owner_select" on public.collection_relation_heads
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.collection_relation_heads from anon, authenticated;
grant select on public.collection_relation_heads to authenticated;

drop policy if exists "collection_repos_owner_all" on public.collection_repos;
create policy "collection_repos_owner_select" on public.collection_repos
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.collection_repos from anon, authenticated;

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
  relation_head public.collection_relation_heads%rowtype;
  desired_present boolean;
  mutation_id uuid;
  item_effective_changed boolean := false;
  item_effective_mutation_id uuid;
  item_effective_relation_version bigint;
begin
  if p_action not in ('add', 'remove') then
    raise exception 'invalid_relation_action';
  end if;

  if not exists (
    select 1 from public.user_stars
    where user_id = p_user_id and repo_id = p_repo_id
  ) then
    raise exception 'repository_not_owned';
  end if;

  if not exists (
    select 1 from public.collections
    where id = p_collection_id and user_id = p_user_id
  ) then
    raise exception 'target_not_owned';
  end if;

  if p_operation_item_id is not null then
    select item.effective_changed, item.effective_mutation_id, item.effective_relation_version
      into item_effective_changed, item_effective_mutation_id, item_effective_relation_version
    from public.bulk_operation_items item
    where item.id = p_operation_item_id
      and item.user_id = p_user_id
      and item.repo_id = p_repo_id
      and item.relation_type = 'collection'
      and item.target_id = p_collection_id
      and item.action = p_action
      and item.status = 'running'
    for update;

    if not found then
      raise exception 'operation_item_not_owned';
    end if;
  end if;

  insert into public.collection_relation_heads (
    user_id,
    collection_id,
    repo_id,
    present,
    version,
    effective_mutation_id
  )
  select
    p_user_id,
    p_collection_id,
    p_repo_id,
    exists (
      select 1 from public.collection_repos
      where user_id = p_user_id
        and collection_id = p_collection_id
        and repo_id = p_repo_id
    ),
    case when exists (
      select 1 from public.collection_repos
      where user_id = p_user_id
        and collection_id = p_collection_id
        and repo_id = p_repo_id
    ) then 1 else 0 end,
    case when exists (
      select 1 from public.collection_repos
      where user_id = p_user_id
        and collection_id = p_collection_id
        and repo_id = p_repo_id
    ) then gen_random_uuid() else null end
  on conflict (user_id, collection_id, repo_id) do nothing;

  select * into relation_head
  from public.collection_relation_heads
  where user_id = p_user_id
    and collection_id = p_collection_id
    and repo_id = p_repo_id
  for update;

  if item_effective_relation_version is not null then
    return jsonb_build_object(
      'effectiveChanged', item_effective_changed,
      'effectiveMutationId', item_effective_mutation_id,
      'relationVersion', item_effective_relation_version
    );
  end if;

  desired_present := p_action = 'add';
  if relation_head.present = desired_present then
    if p_operation_item_id is not null then
      update public.bulk_operation_items
      set
        effective_changed = false,
        effective_mutation_id = null,
        effective_relation_version = relation_head.version
      where id = p_operation_item_id and user_id = p_user_id;
    end if;
    return jsonb_build_object(
      'effectiveChanged', false,
      'effectiveMutationId', null,
      'relationVersion', relation_head.version
    );
  end if;

  mutation_id := gen_random_uuid();
  if desired_present then
    insert into public.collection_repos (user_id, collection_id, repo_id)
    values (p_user_id, p_collection_id, p_repo_id);
  else
    delete from public.collection_repos
    where user_id = p_user_id
      and collection_id = p_collection_id
      and repo_id = p_repo_id;
  end if;

  update public.collection_relation_heads
  set
    present = desired_present,
    version = version + 1,
    effective_mutation_id = mutation_id,
    last_operation_item_id = p_operation_item_id
  where id = relation_head.id
  returning * into relation_head;

  if p_operation_item_id is not null then
    update public.bulk_operation_items
    set
      effective_changed = true,
      effective_mutation_id = mutation_id,
      effective_relation_version = relation_head.version
    where id = p_operation_item_id and user_id = p_user_id;
  end if;

  return jsonb_build_object(
    'effectiveChanged', true,
    'effectiveMutationId', mutation_id,
    'relationVersion', relation_head.version
  );
end;
$$;

drop function public.create_bulk_operation(uuid, text, uuid[], jsonb);

create function public.create_bulk_operation(
  p_user_id uuid,
  p_source text,
  p_interaction text,
  p_client_request_id uuid,
  p_repo_ids uuid[],
  p_changes jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_id uuid;
  normalized_repo_ids uuid[];
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

  select count(*) into change_count from jsonb_array_elements(p_changes);
  if coalesce(cardinality(normalized_repo_ids), 0) = 0
    or change_count = 0
    or cardinality(normalized_repo_ids) * change_count > 10000 then
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
    where change->>'relationType' not in ('tag', 'collection')
      or change->>'action' not in ('add', 'remove')
      or not (
        case change->>'relationType'
          when 'tag' then exists (
            select 1 from public.tags
            where id = (change->>'targetId')::uuid and user_id = p_user_id
          )
          when 'collection' then exists (
            select 1 from public.collections
            where id = (change->>'targetId')::uuid and user_id = p_user_id
          )
          else false
        end
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
      ) = cardinality(normalized_repo_ids) * change_count
      and not exists (
        select 1
        from unnest(normalized_repo_ids) repo_id
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
  from unnest(normalized_repo_ids) repo_id
  cross join jsonb_array_elements(p_changes) change;

  return operation_id;
end;
$$;

create function public.mutate_collection_relation(
  p_collection_id uuid,
  p_repo_id uuid,
  p_action text,
  p_client_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  operation_id uuid;
  operation_item public.bulk_operation_items%rowtype;
  mutation_result jsonb;
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  operation_id := public.create_bulk_operation(
    current_user_id,
    'manual',
    'bulk_dialog',
    p_client_request_id,
    array[p_repo_id],
    jsonb_build_array(jsonb_build_object(
      'relationType', 'collection',
      'targetId', p_collection_id,
      'action', p_action
    ))
  );

  select * into operation_item
  from public.bulk_operation_items item
  where item.operation_id = operation_id
    and item.user_id = current_user_id
    and item.repo_id = p_repo_id
    and item.relation_type = 'collection'
    and item.target_id = p_collection_id
    and item.action = p_action
  for update;

  if operation_item.status = 'succeeded' then
    select jsonb_build_object(
      'effectiveChanged', operation_item.effective_changed,
      'effectiveMutationId', operation_item.effective_mutation_id,
      'relationVersion', operation_item.effective_relation_version,
      'operationId', operation_id,
      'operationItemId', operation_item.id
    ) into mutation_result
    ;
    return mutation_result;
  end if;

  update public.bulk_operation_items
  set status = 'running'
  where id = operation_item.id and user_id = current_user_id;

  mutation_result := public.apply_collection_relation_mutation(
    current_user_id,
    p_collection_id,
    p_repo_id,
    p_action,
    operation_item.id
  );

  perform public.record_bulk_operation_item_result(
    current_user_id,
    operation_item.id,
    'succeeded',
    null,
    null,
    (mutation_result->>'effectiveChanged')::boolean,
    (mutation_result->>'effectiveMutationId')::uuid,
    (mutation_result->>'relationVersion')::bigint
  );

  return mutation_result || jsonb_build_object(
    'operationId', operation_id,
    'operationItemId', operation_item.id
  );
end;
$$;

drop function public.record_bulk_operation_item_result(uuid, uuid, text, text, text);

create function public.record_bulk_operation_item_result(
  p_user_id uuid,
  p_item_id uuid,
  p_status text,
  p_error_code text default null,
  p_error_message text default null,
  p_effective_changed boolean default false,
  p_effective_mutation_id uuid default null,
  p_effective_relation_version bigint default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_id uuid;
  item_relation_type text;
begin
  if p_status not in ('succeeded', 'retryable_failed', 'terminal_failed')
    or (not p_effective_changed and p_effective_mutation_id is not null)
    or (p_status <> 'succeeded' and (
      p_effective_changed
      or p_effective_mutation_id is not null
      or p_effective_relation_version is not null
    )) then
    raise exception 'invalid_item_result';
  end if;

  select relation_type into item_relation_type
  from public.bulk_operation_items
  where id = p_item_id and user_id = p_user_id
  for update;

  if item_relation_type is null then
    raise exception 'operation_not_owned';
  end if;
  if item_relation_type = 'collection'
    and p_status = 'succeeded'
    and (
      p_effective_relation_version is null
      or (p_effective_changed and p_effective_mutation_id is null)
    ) then
    raise exception 'invalid_item_result';
  end if;
  if item_relation_type <> 'collection' and p_effective_relation_version is not null then
    raise exception 'invalid_item_result';
  end if;

  update public.bulk_operation_items
  set
    status = p_status,
    attempt_count = attempt_count + 1,
    last_error_code = p_error_code,
    last_error_message = p_error_message,
    effective_changed = case
      when p_status = 'succeeded' then p_effective_changed
      else bulk_operation_items.effective_changed
    end,
    effective_mutation_id = case
      when p_status = 'succeeded' then p_effective_mutation_id
      else bulk_operation_items.effective_mutation_id
    end,
    effective_relation_version = case
      when p_status = 'succeeded' then p_effective_relation_version
      else bulk_operation_items.effective_relation_version
    end
  where id = p_item_id and user_id = p_user_id
  returning bulk_operation_items.operation_id into operation_id;

  update public.bulk_operations operation
  set
    status = case
      when exists (
        select 1 from public.bulk_operation_items
        where bulk_operation_items.operation_id = operation.id
          and status in ('retryable_failed', 'terminal_failed')
      ) then 'needs_attention'
      when exists (
        select 1 from public.bulk_operation_items
        where bulk_operation_items.operation_id = operation.id
          and status in ('pending', 'running')
      ) then 'running'
      else 'completed'
    end,
    completed_at = case
      when not exists (
        select 1 from public.bulk_operation_items
        where bulk_operation_items.operation_id = operation.id
          and status <> 'succeeded'
      ) then now()
      else null
    end
  where id = operation_id and user_id = p_user_id;
end;
$$;

revoke all on function public.apply_collection_relation_mutation(uuid, uuid, uuid, text, uuid) from public;
revoke all on function public.mutate_collection_relation(uuid, uuid, text, uuid) from public;
revoke all on function public.create_bulk_operation(uuid, text, text, uuid, uuid[], jsonb) from public;
revoke all on function public.record_bulk_operation_item_result(
  uuid, uuid, text, text, text, boolean, uuid, bigint
) from public;

grant execute on function public.apply_collection_relation_mutation(
  uuid, uuid, uuid, text, uuid
) to service_role;
grant execute on function public.mutate_collection_relation(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.create_bulk_operation(
  uuid, text, text, uuid, uuid[], jsonb
) to service_role;
grant execute on function public.record_bulk_operation_item_result(
  uuid, uuid, text, text, text, boolean, uuid, bigint
) to service_role;
