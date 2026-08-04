-- #26: risk-tiered Organization Plan review and atomic hand-off to the durable
-- bulk-operation ledger. Canonical relationship writes remain outside this
-- transaction and are performed only by the bounded bulk-organize executor.

alter table public.organization_tasks
  drop constraint organization_tasks_status_check;
alter table public.organization_tasks
  add constraint organization_tasks_status_check
  check (status in (
    'clarifying',
    'discovering',
    'awaiting_generation_approval',
    'generation_approved',
    'generating',
    'generation_paused',
    'needs_attention',
    'plan_ready',
    'executing',
    'ended'
  ));

alter table public.organization_task_messages
  drop constraint organization_task_messages_checkpoint_type_check;
alter table public.organization_task_messages
  add constraint organization_task_messages_checkpoint_type_check
  check (checkpoint_type in (
    'goal', 'discovery', 'generation_approval', 'generation', 'plan', 'execution', 'ended'
  ));

alter table public.bulk_operations
  drop constraint if exists bulk_operations_source_check;
alter table public.bulk_operations
  add constraint bulk_operations_source_check
  check (source in ('manual', 'ai_draft', 'promotion', 'organization_task'));

create table public.organization_plan_action_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  plan_revision integer not null check (plan_revision > 0),
  action_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, plan_revision, action_id),
  foreign key (task_id, plan_revision)
    references public.organization_plans(task_id, revision) on delete cascade
);

create table public.organization_plan_group_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  plan_revision integer not null check (plan_revision > 0),
  group_key text not null,
  risk_type text not null
    check (risk_type in ('existing_addition', 'new_classification', 'removal')),
  group_fingerprint text not null,
  approved boolean not null,
  task_revision integer not null check (task_revision > 0),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, plan_revision, group_key),
  foreign key (task_id, plan_revision)
    references public.organization_plans(task_id, revision) on delete cascade
);

create table public.organization_task_operation_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  plan_revision integer not null check (plan_revision > 0),
  plan_fingerprint text not null,
  operation_id uuid not null references public.bulk_operations(id) on delete restrict,
  kind text not null check (kind in ('execution')),
  group_fingerprints jsonb not null check (jsonb_typeof(group_fingerprints) = 'array'),
  confirmed_counts jsonb not null check (jsonb_typeof(confirmed_counts) = 'object'),
  created_at timestamptz not null default now(),
  unique (task_id, kind),
  unique (operation_id),
  foreign key (task_id, plan_revision)
    references public.organization_plans(task_id, revision) on delete restrict
);

create index organization_plan_group_reviews_fingerprint_idx
  on public.organization_plan_group_reviews(task_id, group_fingerprint);
create index organization_task_operation_links_user_idx
  on public.organization_task_operation_links(user_id, created_at desc);

create trigger organization_plan_action_exclusions_set_updated_at
before update on public.organization_plan_action_exclusions
for each row execute function public.set_updated_at();
create trigger organization_plan_group_reviews_set_updated_at
before update on public.organization_plan_group_reviews
for each row execute function public.set_updated_at();

alter table public.organization_plan_action_exclusions enable row level security;
alter table public.organization_plan_group_reviews enable row level security;
alter table public.organization_task_operation_links enable row level security;

create policy organization_plan_action_exclusions_owner_read
  on public.organization_plan_action_exclusions for select
  using (auth.uid() = user_id);
create policy organization_plan_group_reviews_owner_read
  on public.organization_plan_group_reviews for select
  using (auth.uid() = user_id);
create policy organization_task_operation_links_owner_read
  on public.organization_task_operation_links for select
  using (auth.uid() = user_id);

revoke all on public.organization_plan_action_exclusions from anon, authenticated;
revoke all on public.organization_plan_group_reviews from anon, authenticated;
revoke all on public.organization_task_operation_links from anon, authenticated;
grant select on public.organization_plan_action_exclusions to authenticated;
grant select on public.organization_plan_group_reviews to authenticated;
grant select on public.organization_task_operation_links to authenticated;

create function public.save_organization_plan_review(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_plan_revision integer,
  p_change jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
  v_plan jsonb;
  v_action_id text;
  v_group_key text;
begin
  select plans.plan into v_plan
  from public.organization_plans plans
  where plans.task_id = p_task_id
    and plans.user_id = p_user_id
    and plans.revision = p_plan_revision
    and plans.revision = (
      select max(candidate.revision)
      from public.organization_plans candidate
      where candidate.task_id = p_task_id and candidate.user_id = p_user_id
    );
  if v_plan is null then return false; end if;

  if p_change->>'kind' = 'exclusion' then
    v_action_id := p_change->>'actionId';
    if v_action_id is null or not exists (
      select 1
      from jsonb_array_elements(v_plan->'groups') plan_group
      cross join jsonb_array_elements(plan_group->'actions') plan_action
      where plan_action->>'id' = v_action_id
    ) then
      raise exception 'organization_plan_action_not_found';
    end if;
  elsif p_change->>'kind' = 'group_review' then
    v_group_key := p_change->>'groupKey';
    if v_group_key is null
      or p_change->>'risk' not in ('existing_addition', 'new_classification', 'removal')
      or nullif(p_change->>'groupFingerprint', '') is null
      or jsonb_typeof(p_change->'approved') <> 'boolean'
    then
      raise exception 'organization_plan_review_invalid';
    end if;
  else
    raise exception 'organization_plan_review_invalid';
  end if;

  update public.organization_tasks
  set revision = revision + 1
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'plan_ready'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  if p_change->>'kind' = 'exclusion' then
    if (p_change->>'excluded')::boolean then
      insert into public.organization_plan_action_exclusions (
        user_id, task_id, plan_revision, action_id
      ) values (p_user_id, p_task_id, p_plan_revision, v_action_id)
      on conflict (task_id, plan_revision, action_id) do nothing;
    else
      delete from public.organization_plan_action_exclusions
      where task_id = p_task_id
        and user_id = p_user_id
        and plan_revision = p_plan_revision
        and action_id = v_action_id;
    end if;
  else
    insert into public.organization_plan_group_reviews (
      user_id, task_id, plan_revision, group_key, risk_type,
      group_fingerprint, approved, task_revision, reviewed_at
    ) values (
      p_user_id, p_task_id, p_plan_revision, v_group_key,
      p_change->>'risk', p_change->>'groupFingerprint',
      (p_change->>'approved')::boolean, v_next_revision, now()
    )
    on conflict (task_id, plan_revision, group_key) do update set
      risk_type = excluded.risk_type,
      group_fingerprint = excluded.group_fingerprint,
      approved = excluded.approved,
      task_revision = excluded.task_revision,
      reviewed_at = now();
  end if;

  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id,
    p_task_id,
    case p_change->>'kind'
      when 'exclusion' then 'plan_action_exclusion_changed'
      else 'plan_group_reviewed'
    end,
    v_next_revision,
    jsonb_build_object(
      'planRevision', p_plan_revision,
      'actionId', v_action_id,
      'groupKey', v_group_key
    )
  );
  return true;
end;
$$;

create function public.confirm_organization_plan(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_plan_revision integer,
  p_review jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.organization_tasks%rowtype;
  v_plan_row public.organization_plans%rowtype;
  v_existing_link public.organization_task_operation_links%rowtype;
  v_operation_id uuid;
  v_next_revision integer;
  v_repo_ids uuid[];
  v_group jsonb;
  v_action jsonb;
  v_target jsonb;
  v_target_id uuid;
  v_normalized_name text;
  v_relation_type text;
  v_risk text;
  v_group_key text;
  v_group_fingerprint text;
  v_relation_exists boolean;
  v_item_count integer := 0;
  v_new_classification_count integer := 0;
  v_addition_count integer := 0;
  v_removal_count integer := 0;
  v_no_op_count integer := 0;
  v_plan_action_count integer := 0;
  v_conflict_no_op_count integer := 0;
  v_latest_review public.organization_plan_group_reviews%rowtype;
begin
  select * into v_existing_link
  from public.organization_task_operation_links
  where task_id = p_task_id and user_id = p_user_id and kind = 'execution';
  if v_existing_link.id is not null then
    if v_existing_link.plan_revision = p_plan_revision
      and v_existing_link.plan_fingerprint = p_review->>'planFingerprint'
      and v_existing_link.group_fingerprints = p_review->'approvedGroupFingerprints'
      and v_existing_link.confirmed_counts = p_review->'counts'
    then
      return jsonb_build_object(
        'outcome', 'replayed',
        'operationId', v_existing_link.operation_id
      );
    end if;
    raise exception 'organization_review_changed';
  end if;

  select * into v_task
  from public.organization_tasks
  where id = p_task_id and user_id = p_user_id
  for update;
  if v_task.id is null then raise exception 'organization_task_not_found'; end if;
  if v_task.revision <> p_expected_revision or v_task.status <> 'plan_ready' then
    raise exception 'organization_task_conflict';
  end if;

  select * into v_plan_row
  from public.organization_plans
  where task_id = p_task_id
    and user_id = p_user_id
    and revision = p_plan_revision
    and revision = (
      select max(candidate.revision)
      from public.organization_plans candidate
      where candidate.task_id = p_task_id and candidate.user_id = p_user_id
    );
  if v_plan_row.id is null
    or v_plan_row.fingerprint <> p_review->>'planFingerprint'
    or (p_review->>'taskId')::uuid <> p_task_id
    or (p_review->>'planRevision')::integer <> p_plan_revision
  then
    raise exception 'organization_review_changed';
  end if;

  if jsonb_typeof(p_review->'groups') <> 'array'
    or jsonb_typeof(p_review->'approvedGroupFingerprints') <> 'array'
    or jsonb_typeof(p_review->'counts') <> 'object'
    or not (p_review->'counts' ?& array[
      'newClassifications', 'additions', 'removals', 'noOps'
    ])
    or (select count(*) from jsonb_object_keys(p_review->'counts')) <> 4
    or jsonb_typeof(p_review->'counts'->'newClassifications') <> 'number'
    or jsonb_typeof(p_review->'counts'->'additions') <> 'number'
    or jsonb_typeof(p_review->'counts'->'removals') <> 'number'
    or jsonb_typeof(p_review->'counts'->'noOps') <> 'number'
    or (p_review->'counts'->>'newClassifications')::integer < 0
    or (p_review->'counts'->>'additions')::integer < 0
    or (p_review->'counts'->>'removals')::integer < 0
    or (p_review->'counts'->>'noOps')::integer < 0
  then
    raise exception 'organization_plan_review_invalid';
  end if;

  create temporary table organization_confirmation_items (
    repo_id uuid not null,
    relation_type text not null,
    target_id uuid not null,
    action text not null,
    unique (repo_id, relation_type, target_id, action)
  ) on commit drop;

  for v_group in select value from jsonb_array_elements(p_review->'groups') loop
    v_group_key := v_group->>'key';
    v_group_fingerprint := v_group->>'fingerprint';
    v_risk := v_group->>'risk';
    v_relation_type := v_group->>'relationType';
    v_target := v_group->'target';
    if v_risk not in ('existing_addition', 'new_classification', 'removal')
      or v_relation_type not in ('tag', 'collection')
      or nullif(v_group_key, '') is null
      or nullif(v_group_fingerprint, '') is null
      or jsonb_typeof(v_group->'approved') <> 'boolean'
      or jsonb_typeof(v_group->'actions') <> 'array'
    then
      raise exception 'organization_plan_review_invalid';
    end if;

    if ((v_group->>'approved')::boolean) <>
      (p_review->'approvedGroupFingerprints' ? v_group_fingerprint)
    then
      raise exception 'organization_review_changed';
    end if;

    select * into v_latest_review
    from public.organization_plan_group_reviews reviewed
    where reviewed.task_id = p_task_id
      and reviewed.user_id = p_user_id
      and reviewed.plan_revision <= p_plan_revision
      and reviewed.group_key = v_group_key
      and reviewed.risk_type = v_risk
    order by reviewed.plan_revision desc
    limit 1;

    if (v_group->>'approved')::boolean then
      if v_risk in ('new_classification', 'removal') and (
        v_latest_review.id is null
        or v_latest_review.group_fingerprint <> v_group_fingerprint
        or not v_latest_review.approved
      ) then
        raise exception 'organization_review_changed';
      end if;
      if v_risk = 'existing_addition'
        and v_latest_review.group_fingerprint = v_group_fingerprint
        and not v_latest_review.approved
      then
        raise exception 'organization_review_changed';
      end if;

    if v_target->>'kind' = 'existing' then
      v_target_id := (v_target->>'id')::uuid;
      if not (
        case v_relation_type
          when 'tag' then exists (
            select 1 from public.tags
            where id = v_target_id
              and user_id = p_user_id
              and public.normalize_classification_name(name) =
                public.normalize_classification_name(v_target->>'name')
          )
          when 'collection' then exists (
            select 1 from public.collections
            where id = v_target_id
              and user_id = p_user_id
              and public.normalize_classification_name(name) =
                public.normalize_classification_name(v_target->>'name')
          )
          else false
        end
      ) then
        raise exception 'organization_target_changed';
      end if;
    elsif v_target->>'kind' = 'new' then
      v_normalized_name := public.normalize_classification_name(v_group->>'normalizedName');
      if v_normalized_name is null or length(v_normalized_name) = 0 then
        raise exception 'organization_classification_name_invalid';
      end if;
      if v_relation_type = 'tag' then
        select id into v_target_id from public.tags
        where user_id = p_user_id
          and public.normalize_classification_name(name) = v_normalized_name
        order by id limit 1;
        if v_target_id is null and exists (
          select 1 from public.tags
          where user_id = p_user_id
            and public.classification_name_near_key(name) =
              public.classification_name_near_key(v_group->>'normalizedName')
        ) then
          raise exception 'organization_classification_near_match';
        end if;
        if v_target_id is null and (v_group->>'approved')::boolean then
          insert into public.tags(user_id, name)
          values (p_user_id, normalize(trim(v_group->>'normalizedName'), NFKC))
          on conflict (user_id, (public.normalize_classification_name(name))) do nothing
          returning id into v_target_id;
          if v_target_id is not null then
            v_new_classification_count := v_new_classification_count + 1;
          else
            select id into v_target_id from public.tags
            where user_id = p_user_id
              and public.normalize_classification_name(name) = v_normalized_name
            order by id limit 1;
          end if;
        end if;
      else
        select id into v_target_id from public.collections
        where user_id = p_user_id
          and public.normalize_classification_name(name) = v_normalized_name
        order by id limit 1;
        if v_target_id is null and exists (
          select 1 from public.collections
          where user_id = p_user_id
            and public.classification_name_near_key(name) =
              public.classification_name_near_key(v_group->>'normalizedName')
        ) then
          raise exception 'organization_classification_near_match';
        end if;
        if v_target_id is null and (v_group->>'approved')::boolean then
          insert into public.collections(user_id, name)
          values (p_user_id, normalize(trim(v_group->>'normalizedName'), NFKC))
          on conflict (user_id, (public.normalize_classification_name(name))) do nothing
          returning id into v_target_id;
          if v_target_id is not null then
            v_new_classification_count := v_new_classification_count + 1;
          else
            select id into v_target_id from public.collections
            where user_id = p_user_id
              and public.normalize_classification_name(name) = v_normalized_name
            order by id limit 1;
          end if;
        end if;
      end if;
    else
      raise exception 'organization_plan_review_invalid';
    end if;

    for v_action in select value from jsonb_array_elements(v_group->'actions') loop
        if (v_action->>'eligible')::boolean then
          if exists (
            select 1 from public.organization_plan_action_exclusions excluded
            where excluded.task_id = p_task_id
              and excluded.user_id = p_user_id
              and excluded.plan_revision = p_plan_revision
              and excluded.action_id = v_action->>'id'
          ) then
            raise exception 'organization_review_changed';
          end if;
          if not exists (
            select 1
            from jsonb_array_elements(v_plan_row.plan->'groups') source_group
            cross join jsonb_array_elements(source_group->'actions') source_action
            where source_action->>'id' = v_action->>'id'
              and source_action->>'repoId' = v_action->>'repoId'
              and source_action->>'relationType' = v_relation_type
              and source_action->>'action' = v_action->>'action'
              and source_action->'target' = v_action->'target'
              and v_action->'target' = v_target
          ) then
            raise exception 'organization_review_changed';
          end if;
          if not exists (
            select 1 from public.user_stars
            where user_id = p_user_id and repo_id = (v_action->>'repoId')::uuid
          ) then
            raise exception 'organization_repository_unauthorized';
          end if;

          if v_target_id is null then raise exception 'organization_review_changed'; end if;
          if v_relation_type = 'tag' then
            select exists (
              select 1 from public.repo_tags
              where user_id = p_user_id
                and repo_id = (v_action->>'repoId')::uuid
                and tag_id = v_target_id
            ) into v_relation_exists;
          else
            select exists (
              select 1 from public.collection_repos
              where user_id = p_user_id
                and repo_id = (v_action->>'repoId')::uuid
                and collection_id = v_target_id
            ) into v_relation_exists;
          end if;
          if (v_action->>'action' = 'add' and v_relation_exists)
            or (v_action->>'action' = 'remove' and not v_relation_exists)
          then
            raise exception 'organization_precondition_changed';
          end if;

          insert into organization_confirmation_items(repo_id, relation_type, target_id, action)
          values (
            (v_action->>'repoId')::uuid,
            v_relation_type,
            v_target_id,
            v_action->>'action'
          ) on conflict do nothing;
        end if;
    end loop;
    end if;
  end loop;

  if jsonb_array_length(p_review->'approvedGroupFingerprints') <> (
    select count(*)
    from jsonb_array_elements(p_review->'groups') reviewed_group
    where (reviewed_group->>'approved')::boolean
  ) then
    raise exception 'organization_review_changed';
  end if;

  select count(*),
    count(*) filter (where action = 'add'),
    count(*) filter (where action = 'remove')
  into v_item_count, v_addition_count, v_removal_count
  from organization_confirmation_items;

  select coalesce(sum(jsonb_array_length(plan_group->'actions')), 0)
  into v_plan_action_count
  from jsonb_array_elements(v_plan_row.plan->'groups') plan_group;
  select coalesce(sum(jsonb_array_length(plan_conflict->'repoIds')), 0)
  into v_conflict_no_op_count
  from jsonb_array_elements(v_plan_row.plan->'conflicts') plan_conflict;
  v_no_op_count := v_plan_action_count - v_item_count
    + v_conflict_no_op_count
    + jsonb_array_length(v_plan_row.plan->'uncertainties');

  if v_new_classification_count <> (p_review->'counts'->>'newClassifications')::integer
    or v_addition_count <> (p_review->'counts'->>'additions')::integer
    or v_removal_count <> (p_review->'counts'->>'removals')::integer
    or v_no_op_count <> (p_review->'counts'->>'noOps')::integer
  then
    raise exception 'organization_review_changed';
  end if;

  if v_item_count = 0 then raise exception 'organization_review_items_required'; end if;

  select array_agg(repo_id order by repo_id) into v_repo_ids
  from (select distinct repo_id from organization_confirmation_items) repositories;

  insert into public.bulk_operations(user_id, source, source_repo_ids)
  values (p_user_id, 'organization_task', v_repo_ids)
  returning id into v_operation_id;

  insert into public.bulk_operation_items(
    user_id, operation_id, repo_id, relation_type, target_id, action
  )
  select p_user_id, v_operation_id, repo_id, relation_type, target_id, action
  from organization_confirmation_items;

  update public.organization_tasks
  set status = 'executing', revision = revision + 1, attention_code = null
  where id = p_task_id and user_id = p_user_id and revision = p_expected_revision
  returning revision into v_next_revision;
  if v_next_revision is null then raise exception 'organization_task_conflict'; end if;

  insert into public.organization_task_operation_links(
    user_id, task_id, plan_revision, plan_fingerprint, operation_id,
    kind, group_fingerprints, confirmed_counts
  ) values (
    p_user_id, p_task_id, p_plan_revision, p_review->>'planFingerprint',
    v_operation_id, 'execution', p_review->'approvedGroupFingerprints', p_review->'counts'
  );

  insert into public.organization_task_messages(
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'organization_plan_confirmed',
    'execution', v_next_revision
  );
  insert into public.organization_task_events(
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id, p_task_id, 'execution_linked', v_next_revision,
    jsonb_build_object(
      'planRevision', p_plan_revision,
      'operationId', v_operation_id,
      'counts', p_review->'counts'
    )
  );
  return jsonb_build_object('outcome', 'created', 'operationId', v_operation_id);
end;
$$;

revoke all on function public.save_organization_plan_review(uuid, uuid, integer, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.confirm_organization_plan(uuid, uuid, integer, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_organization_plan_review(uuid, uuid, integer, integer, jsonb)
  to service_role;
grant execute on function public.confirm_organization_plan(uuid, uuid, integer, integer, jsonb)
  to service_role;
