-- Upgrade generated suggestions into durable human-review state. Existing
-- relation suggestions start selected; new classifications require opt-in.

update public.ai_organization_drafts as draft
set
  suggestion_version = 2,
  suggestions = jsonb_build_object(
    'version',
    2,
    'relationChanges',
    coalesce(
      (
        select jsonb_agg(
          relation.value || jsonb_build_object(
            'id',
            'relation-' || relation.ordinality,
            'selected',
            true
          )
          order by relation.ordinality
        )
        from jsonb_array_elements(draft.suggestions -> 'relationChanges')
          with ordinality as relation(value, ordinality)
      ),
      '[]'::jsonb
    ),
    'newClassifications',
    coalesce(
      (
        select jsonb_agg(
          classification.value || jsonb_build_object(
            'id',
            'classification-' || classification.ordinality,
            'approved',
            false
          )
          order by classification.ordinality
        )
        from jsonb_array_elements(draft.suggestions -> 'newClassifications')
          with ordinality as classification(value, ordinality)
      ),
      '[]'::jsonb
    )
  ),
  revision = draft.revision + 1,
  updated_at = now()
where draft.suggestion_version = 1;

alter table public.ai_organization_drafts
  add constraint ai_organization_drafts_review_schema_check
  check (
    suggestion_version = 2
    and suggestions ->> 'version' = '2'
    and jsonb_typeof(suggestions -> 'relationChanges') = 'array'
    and jsonb_typeof(suggestions -> 'newClassifications') = 'array'
  );

create function public.update_ai_organization_draft_review(
  p_user_id uuid,
  p_expected_revision integer,
  p_suggestions jsonb
)
returns setof public.ai_organization_drafts
language sql
security definer
set search_path = ''
as $$
  update public.ai_organization_drafts
  set
    suggestion_version = 2,
    suggestions = p_suggestions,
    revision = revision + 1,
    updated_at = now()
  where
    user_id = p_user_id
    and revision = p_expected_revision
  returning *;
$$;

revoke all on function public.update_ai_organization_draft_review(
  uuid, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.update_ai_organization_draft_review(
  uuid, integer, jsonb
) to service_role;
