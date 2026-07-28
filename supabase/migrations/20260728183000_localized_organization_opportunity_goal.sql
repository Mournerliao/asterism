-- Opportunity stores machine-readable kind/count; accepting clients provide copy
-- from the active locale so persisted Task text follows the user's current language.

drop function public.accept_organization_opportunity(uuid, uuid);

create or replace function public.accept_organization_opportunity_with_goal(
  p_user_id uuid,
  p_opportunity_id uuid,
  p_goal text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opportunity public.organization_opportunities%rowtype;
  v_task_id uuid;
begin
  if length(trim(p_goal)) = 0 or length(p_goal) > 4000 then
    return null;
  end if;

  select * into v_opportunity
  from public.organization_opportunities
  where id = p_opportunity_id and user_id = p_user_id
  for update;
  if v_opportunity.id is null or v_opportunity.status = 'ignored' then return null; end if;
  if v_opportunity.accepted_task_id is not null then
    return v_opportunity.accepted_task_id;
  end if;

  insert into public.organization_tasks (
    user_id, origin, opportunity_id, goal, suggested_goal, context_repo_ids
  ) values (
    p_user_id, 'opportunity', v_opportunity.id, trim(p_goal),
    trim(p_goal), v_opportunity.context_repo_ids
  ) returning id into v_task_id;
  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, v_task_id, 'user', trim(p_goal), 'goal', 1
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id, v_task_id, 'opportunity_accepted', 1,
    jsonb_build_object('opportunityId', v_opportunity.id)
  );
  update public.organization_opportunities
  set status = 'accepted', accepted_task_id = v_task_id
  where id = v_opportunity.id;
  return v_task_id;
end;
$$;

revoke all on function public.accept_organization_opportunity_with_goal(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.accept_organization_opportunity_with_goal(uuid, uuid, text)
  to service_role;

create or replace function public.update_organization_task_goal(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_goal text,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
begin
  update public.organization_tasks
  set goal = trim(p_goal),
      status = 'clarifying',
      revision = revision + 1,
      current_snapshot_revision = null,
      current_manifest_fingerprint = null
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status in ('clarifying', 'awaiting_generation_approval')
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'user', coalesce(p_message, trim(p_goal)), 'goal', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'goal_updated', v_next_revision);
  return true;
end;
$$;
