-- Retire the server-side AI organization feature while preserving canonical
-- tags, collections, notes, relations, and browser-generated embeddings.

drop trigger if exists user_settings_validate_generation_selection on public.user_settings;
drop trigger if exists ai_provider_connections_clear_invalid_selection on public.ai_provider_connections;

drop function if exists public.replace_ai_organization_draft(uuid, uuid[], integer, jsonb, uuid, text, text);
drop function if exists public.update_ai_organization_draft_review(uuid, integer, jsonb);
drop function if exists public.confirm_ai_organization_draft(uuid, uuid, integer, jsonb);
drop function if exists public.classification_name_near_key(text);
drop function if exists public.validate_generation_selection();
drop function if exists public.clear_invalid_generation_selection();
drop function if exists public.confirm_organization_plan(uuid, uuid, integer, integer, jsonb);
drop function if exists public.save_organization_plan_review(uuid, uuid, integer, integer, jsonb);
drop function if exists public.save_organization_plan(uuid, uuid, integer, jsonb);
drop function if exists public.complete_organization_generation_page(
  uuid, uuid, uuid, uuid, text, text, jsonb, jsonb, text, jsonb
);
drop function if exists public.claim_organization_generation_page(uuid, uuid, integer);
drop function if exists public.flag_organization_generation_attention(uuid, uuid, integer, text);
drop function if exists public.retry_organization_generation(uuid, uuid, integer);
drop function if exists public.resume_organization_generation(uuid, uuid, integer);
drop function if exists public.pause_organization_generation(uuid, uuid, integer);
drop function if exists public.start_organization_generation(uuid, uuid, integer);
drop function if exists public.approve_organization_task_generation(uuid, uuid, integer, text);
drop function if exists public.end_organization_task(uuid, uuid, integer);
drop function if exists public.update_organization_task_goal(uuid, uuid, integer, text, text);
drop function if exists public.save_organization_task_checkpoint(uuid, uuid, integer, jsonb, jsonb);
drop function if exists public.accept_organization_opportunity_with_goal(uuid, uuid, text);
drop function if exists public.accept_organization_opportunity(uuid, uuid);
drop function if exists public.create_organization_task(uuid, text, uuid[]);

-- The execution link uses ON DELETE RESTRICT for the operation ledger. Remove
-- the AI provenance link first, then remove only AI-origin operation rows.
drop table if exists public.organization_task_operation_links;
delete from public.bulk_operations
where source in ('ai_draft', 'organization_task');

drop table if exists public.organization_plan_group_reviews;
drop table if exists public.organization_plan_action_exclusions;
drop table if exists public.organization_generation_calls;
drop table if exists public.organization_generation_page_runs;
drop table if exists public.organization_plans;
drop table if exists public.organization_generation_approvals;
drop table if exists public.organization_generation_manifest_pages;
drop table if exists public.organization_generation_manifests;
drop table if exists public.organization_candidate_items;
drop table if exists public.organization_candidate_snapshots;
drop table if exists public.organization_task_events;
drop table if exists public.organization_task_messages;
-- These two tables reference each other; dropping them in one statement keeps
-- the dependency explicit without cascading into unrelated canonical data.
drop table if exists public.organization_opportunities, public.organization_tasks;
drop table if exists public.ai_organization_drafts;
drop table if exists public.user_settings;
drop table if exists public.ai_provider_connections;

drop index if exists public.bulk_operations_user_source_draft_idx;
alter table public.bulk_operations
  drop constraint if exists bulk_operations_source_draft_payload_check,
  drop column if exists source_draft_id,
  drop column if exists source_draft_revision,
  drop column if exists source_draft_suggestions;

alter table public.bulk_operations
  drop constraint if exists bulk_operations_source_check;
alter table public.bulk_operations
  add constraint bulk_operations_source_check
  check (source in ('manual', 'promotion'));

create or replace function public.create_bulk_operation(
  p_user_id uuid,
  p_source text,
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
  if p_source <> 'manual' or jsonb_typeof(p_changes) <> 'array' then
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

  insert into public.bulk_operations (user_id, source, source_repo_ids)
  values (p_user_id, p_source, normalized_repo_ids)
  returning id into operation_id;

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
