import { Badge, Button, Separator, Skeleton, Textarea } from '@asterism/ui';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CircleMinusIcon,
  CirclePlusIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  HistoryIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  MessageSquareTextIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BulkOperationBanner } from '../components/bulk-organization';
import { useBulkOperationActions, useBulkOperations } from '../data/use-bulk-operations';
import {
  useAcceptOrganizationOpportunity,
  useApproveOrganizationGeneration,
  useConfirmOrganizationPlan,
  useCreateOrganizationTask,
  useDiscoverOrganizationTask,
  useEndOrganizationTask,
  useExcludeOrganizationCandidate,
  useExcludeOrganizationPlanAction,
  useIgnoreOrganizationOpportunity,
  useOrganizationOpportunities,
  useOrganizationPlanReview,
  useOrganizationTask,
  useOrganizationTasks,
  usePauseOrganizationGeneration,
  useResumeOrganizationGeneration,
  useRetryOrganizationGeneration,
  useReviewOrganizationPlanGroup,
  useRunOrganizationGenerationPage,
  useStartOrganizationGeneration,
  useUpdateOrganizationTaskGoal,
} from '../data/use-organization-tasks';
import { useStarredRepos } from '../data/use-starred-repos';

function MutationError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  const code = error instanceof Error ? error.message : 'organization_task_failed';
  const known = [
    'organization_task_conflict',
    'organization_task_ended',
    'organization_candidates_required',
    'generation_connection_required',
    'organization_discovery_interrupted',
    'organization_candidate_authorization_changed',
    'organization_retry_exhausted',
    'organization_review_changed',
    'organization_group_fingerprint_changed',
    'organization_plan_group_not_found',
    'organization_plan_action_not_found',
    'organization_classification_near_match',
    'organization_target_changed',
    'organization_classification_name_invalid',
    'organization_repository_unauthorized',
    'organization_precondition_changed',
    'organization_review_items_required',
  ].includes(code);
  return (
    <p role="alert" className="text-caption text-destructive">
      {t(
        known
          ? `organizationTasks.errors.${code}`
          : 'organizationTasks.errors.organization_task_failed',
      )}
    </p>
  );
}

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
    >
      <p className="text-caption text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCwIcon className="size-4" aria-hidden="true" />
        {t('organizationTasks.retry')}
      </Button>
    </div>
  );
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header>
      <h1 className="font-bold text-page-title text-wrap-balance">{title}</h1>
      <p className="mt-1 max-w-[70ch] text-body text-muted-foreground text-pretty">{description}</p>
    </header>
  );
}

export function OrganizationTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tasks = useOrganizationTasks();
  const opportunities = useOrganizationOpportunities();
  const createTask = useCreateOrganizationTask();
  const acceptOpportunity = useAcceptOrganizationOpportunity();
  const ignoreOpportunity = useIgnoreOrganizationOpportunity();
  const [goal, setGoal] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!goal.trim()) return;
    const task = await createTask.mutateAsync({
      goal: goal.trim(),
      contextRepositoryIds: [],
    });
    void navigate(`/organization/tasks/${task.id}`);
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto pb-8">
      <PageHeading
        title={t('organizationTasks.title')}
        description={t('organizationTasks.description')}
      />

      {opportunities.isError ? (
        <QueryError
          message={t('organizationTasks.errors.opportunities_load_failed')}
          retry={() => void opportunities.refetch()}
        />
      ) : (opportunities.data?.length ?? 0) > 0 ? (
        <section aria-labelledby="organization-opportunities" className="flex flex-col gap-3">
          <h2 id="organization-opportunities" className="font-semibold text-section-title">
            {t('organizationTasks.opportunities.title')}
          </h2>
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {opportunities.data?.map((opportunity) => {
              const suggestedGoal = t(
                opportunity.kind === 'initial_order'
                  ? 'organizationTasks.opportunities.initialGoal'
                  : 'organizationTasks.opportunities.newStarsGoal',
                { count: opportunity.repositoryCount },
              );
              const ignoring =
                ignoreOpportunity.isPending && ignoreOpportunity.variables === opportunity.id;
              const accepting =
                acceptOpportunity.isPending &&
                acceptOpportunity.variables?.opportunityId === opportunity.id;
              return (
                <div key={opportunity.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
                  <div className="min-w-60 flex-1">
                    <p className="font-medium text-body">{suggestedGoal}</p>
                    <p className="text-caption text-muted-foreground">
                      {t('organizationTasks.opportunities.noCost', {
                        count: opportunity.repositoryCount,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="min-w-20"
                    disabled={ignoreOpportunity.isPending}
                    aria-busy={ignoring}
                    onClick={() => ignoreOpportunity.mutate(opportunity.id)}
                  >
                    {ignoring ? (
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {t('organizationTasks.opportunities.ignore')}
                  </Button>
                  <Button
                    className="min-w-32"
                    disabled={acceptOpportunity.isPending}
                    aria-busy={accepting}
                    onClick={async () => {
                      const task = await acceptOpportunity.mutateAsync({
                        opportunityId: opportunity.id,
                        goal: suggestedGoal,
                      });
                      void navigate(`/organization/tasks/${task.id}`);
                    }}
                  >
                    {accepting ? (
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {t('organizationTasks.opportunities.accept')}
                  </Button>
                </div>
              );
            })}
          </div>
          <MutationError error={acceptOpportunity.error ?? ignoreOpportunity.error} />
        </section>
      ) : null}

      <section
        aria-labelledby="organization-new-task"
        className="flex flex-col gap-4 rounded-lg border bg-card p-5"
      >
        <div className="flex items-start gap-3">
          <MessageSquareTextIcon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 id="organization-new-task" className="font-semibold text-section-title">
              {t('organizationTasks.create.title')}
            </h2>
            <p className="mt-1 text-body text-muted-foreground">
              {t('organizationTasks.create.description')}
            </p>
          </div>
        </div>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Textarea
            aria-label={t('organizationTasks.create.goalLabel')}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder={t('organizationTasks.create.placeholder')}
            className="min-h-24 resize-y"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-caption text-muted-foreground">
              {t('organizationTasks.create.contextHint')}
            </p>
            <Button
              type="submit"
              className="min-w-32"
              disabled={!goal.trim() || createTask.isPending}
              aria-busy={createTask.isPending}
            >
              {createTask.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {createTask.isPending
                ? t('organizationTasks.create.creating')
                : t('organizationTasks.create.action')}
              {!createTask.isPending ? (
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              ) : null}
            </Button>
          </div>
          <MutationError error={createTask.error} />
        </form>
      </section>

      <section aria-labelledby="organization-history" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="organization-history" className="font-semibold text-section-title">
            {t('organizationTasks.history.title')}
          </h2>
        </div>
        {tasks.isLoading ? (
          <div
            role="status"
            className="flex flex-col gap-2"
            aria-label={t('organizationTasks.loading')}
          >
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : tasks.isError ? (
          <QueryError
            message={t('organizationTasks.errors.tasks_load_failed')}
            retry={() => void tasks.refetch()}
          />
        ) : (tasks.data?.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-body text-muted-foreground">
            {t('organizationTasks.history.empty')}
          </p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {tasks.data?.map((task) => (
              <Link
                key={task.id}
                to={`/organization/tasks/${task.id}`}
                className="flex min-h-14 items-center gap-3 px-4 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-body">{task.goal}</span>
                <Badge variant="outline">{t(`organizationTasks.status.${task.status}`)}</Badge>
                <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkloadDisclosure({
  task,
}: {
  task: NonNullable<ReturnType<typeof useOrganizationTask>['data']>;
}) {
  const { t } = useTranslation();
  const manifest = task.manifest;
  if (!manifest) return null;
  const adapter = t(`organizationTasks.adapters.${manifest.connection.adapter}`, {
    defaultValue: manifest.connection.adapter,
  });
  return (
    <section aria-labelledby="generation-disclosure" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <ShieldCheckIcon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 id="generation-disclosure" className="font-semibold text-section-title">
            {t('organizationTasks.disclosure.title')}
          </h2>
          <p className="mt-1 text-body text-muted-foreground">
            {t('organizationTasks.disclosure.description')}
          </p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-4 text-body sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-caption text-muted-foreground">
            {t('organizationTasks.disclosure.connection')}
          </dt>
          <dd className="mt-1 font-medium">{adapter}</dd>
          <dd className="font-mono text-caption">{manifest.connection.model}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">
            {t('organizationTasks.disclosure.workload')}
          </dt>
          <dd className="mt-1 font-medium">
            {t('organizationTasks.disclosure.workloadValue', {
              count: manifest.candidateCount,
              pages: manifest.pageCount,
            })}
          </dd>
          <dd className="text-caption text-muted-foreground">
            {t('organizationTasks.disclosure.calls', {
              initial: manifest.maxInitialCalls,
              retry: manifest.maxRetryCalls,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">
            {t('organizationTasks.disclosure.tokens')}
          </dt>
          <dd className="mt-1 font-mono font-medium">
            {manifest.estimatedTokenCeiling.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">
            {t('organizationTasks.disclosure.cost')}
          </dt>
          <dd className="mt-1 font-medium">{t('organizationTasks.disclosure.costUnknown')}</dd>
          <dd className="text-caption text-muted-foreground">
            {t('organizationTasks.disclosure.costUnknownHint')}
          </dd>
        </div>
      </dl>
      <div className="rounded-md bg-muted px-4 py-3 text-caption">
        <p>
          <span className="font-medium">{t('organizationTasks.disclosure.fields')}</span>{' '}
          {manifest.fields.map((field) => t(`organizationTasks.fields.${field}`)).join(', ')}
        </p>
        <p className="mt-1 text-muted-foreground">
          {t('organizationTasks.disclosure.truncation', {
            description: manifest.truncation.descriptionCodePoints,
            notes: manifest.truncation.noteCodePoints,
          })}
        </p>
        <p className="mt-1 text-muted-foreground">{t('organizationTasks.disclosure.excluded')}</p>
      </div>
    </section>
  );
}

function GenerationProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

type OrganizationTask = NonNullable<ReturnType<typeof useOrganizationTask>['data']>;
type OrganizationPlanReview = NonNullable<ReturnType<typeof useOrganizationPlanReview>['data']>;
type OrganizationPlanReviewGroup = OrganizationPlanReview['groups'][number];

const REVIEW_RISKS = [
  'existing_addition',
  'new_classification',
  'removal',
] as const satisfies ReadonlyArray<OrganizationPlanReviewGroup['risk']>;

function ReviewGroup({
  task,
  review,
  group,
}: {
  task: OrganizationTask;
  review: OrganizationPlanReview;
  group: OrganizationPlanReviewGroup;
}) {
  const { t } = useTranslation();
  const reviewGroup = useReviewOrganizationPlanGroup();
  const excludeAction = useExcludeOrganizationPlanAction();
  const pending = reviewGroup.isPending || excludeAction.isPending;
  const explicitApproval = group.risk !== 'existing_addition';
  const headingId = useId();
  const actionLabel = group.approved
    ? t('organizationTasks.review.cancelGroup')
    : group.risk === 'new_classification'
      ? t('organizationTasks.review.approveNew')
      : group.risk === 'removal'
        ? t('organizationTasks.review.approveRemoval')
        : t('organizationTasks.review.includeGroup');

  return (
    <section aria-labelledby={headingId} className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-56 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 id={headingId} className="font-medium text-body">
              {group.normalizedName}
            </h4>
            <Badge variant="outline">
              {t(`organizationTasks.review.kind.${group.relationType}`)}
            </Badge>
            {explicitApproval ? (
              <Badge variant={group.approved ? 'secondary' : 'outline'}>
                {group.approved
                  ? t('organizationTasks.review.approved')
                  : t('organizationTasks.review.explicitApproval')}
              </Badge>
            ) : null}
          </div>
          {group.target.kind === 'new' ? (
            <div className="mt-1 flex flex-col gap-0.5 text-caption text-muted-foreground">
              <p>
                {group.equivalentTarget
                  ? t('organizationTasks.review.equivalent', { name: group.equivalentTarget.name })
                  : t('organizationTasks.review.normalized', { name: group.normalizedName })}
              </p>
              <p>
                {t('organizationTasks.review.dependencies', {
                  repositories: group.actions
                    .slice(0, 3)
                    .map((action) => action.repositoryName ?? action.repoId)
                    .join(', '),
                  count: group.actions.length,
                })}
              </p>
            </div>
          ) : null}
          {group.nearMatches.length > 0 ? (
            <p role="alert" className="mt-2 text-caption text-warning">
              {t('organizationTasks.review.nearMatches', {
                names: group.nearMatches.map((entry) => entry.name).join(', '),
              })}
            </p>
          ) : null}
          {group.validity !== 'valid' && group.validity !== 'near_match' ? (
            <p role="status" className="mt-2 text-caption text-warning">
              {t(`organizationTasks.review.validity.${group.validity}`)}
            </p>
          ) : null}
        </div>
        <Button
          variant={group.approved ? 'ghost' : 'outline'}
          size="sm"
          disabled={pending || group.validity !== 'valid'}
          aria-pressed={group.approved}
          aria-label={t('organizationTasks.review.groupAction', {
            action: actionLabel,
            target: group.normalizedName,
          })}
          aria-busy={reviewGroup.isPending && reviewGroup.variables?.groupKey === group.key}
          onClick={() =>
            reviewGroup.mutate({
              taskId: task.id,
              expectedRevision: task.revision,
              planRevision: review.planRevision,
              groupKey: group.key,
              groupFingerprint: group.fingerprint,
              approved: !group.approved,
            })
          }
        >
          {reviewGroup.isPending && reviewGroup.variables?.groupKey === group.key ? (
            <LoaderCircleIcon
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : group.risk === 'removal' ? (
            <CircleMinusIcon className="size-4" aria-hidden="true" />
          ) : (
            <CirclePlusIcon className="size-4" aria-hidden="true" />
          )}
          {actionLabel}
        </Button>
      </div>

      <details className="mt-3 border-t pt-3">
        <summary className="cursor-pointer select-none text-caption text-link outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {t('organizationTasks.review.repositories', { count: group.actions.length })}
        </summary>
        <div className="mt-2 divide-y">
          {group.actions.map((action) => {
            const excluding =
              excludeAction.isPending && excludeAction.variables?.actionId === action.id;
            return (
              <div key={action.id} className="flex min-h-14 flex-wrap items-center gap-3 py-2">
                <div className="min-w-56 flex-1">
                  <p className="truncate font-mono text-caption">
                    {action.repositoryName ?? action.repoId}
                  </p>
                  <p className="text-micro text-muted-foreground">
                    {t('organizationTasks.review.evidence', {
                      pages: action.evidencePages.join(', '),
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  aria-pressed={!action.excluded}
                  aria-label={t('organizationTasks.review.repositoryAction', {
                    action: action.excluded
                      ? t('organizationTasks.review.includeRepository')
                      : t('organizationTasks.review.excludeRepository'),
                    repository: action.repositoryName ?? action.repoId,
                  })}
                  aria-busy={excluding}
                  onClick={() =>
                    excludeAction.mutate({
                      taskId: task.id,
                      expectedRevision: task.revision,
                      planRevision: review.planRevision,
                      actionId: action.id,
                      excluded: !action.excluded,
                    })
                  }
                >
                  {excluding ? (
                    <LoaderCircleIcon
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : null}
                  {action.excluded
                    ? t('organizationTasks.review.includeRepository')
                    : t('organizationTasks.review.excludeRepository')}
                </Button>
              </div>
            );
          })}
        </div>
      </details>
      <MutationError error={reviewGroup.error ?? excludeAction.error} />
    </section>
  );
}

function PlanReviewPanel({ task }: { task: OrganizationTask }) {
  const { t } = useTranslation();
  const plan = task.plans[0];
  const reviewQuery = useOrganizationPlanReview(task.id, plan?.revision);
  const confirm = useConfirmOrganizationPlan();

  if (!plan) return null;
  if (reviewQuery.isLoading) {
    return (
      <section aria-label={t('organizationTasks.review.loading')} className="flex flex-col gap-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-44 w-full" />
      </section>
    );
  }
  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <QueryError
        message={t('organizationTasks.errors.review_load_failed')}
        retry={() => void reviewQuery.refetch()}
      />
    );
  }
  const review = reviewQuery.data;

  return (
    <section aria-labelledby="organization-plan-review" className="flex flex-col gap-5">
      <div>
        <h2 id="organization-plan-review" className="font-semibold text-section-title">
          {t('organizationTasks.review.title')}
        </h2>
        <p className="mt-1 max-w-[70ch] text-body text-muted-foreground">
          {t('organizationTasks.review.description')}
        </p>
      </div>

      {REVIEW_RISKS.map((risk) => {
        const groups = review.groups.filter((group) => group.risk === risk);
        if (groups.length === 0) return null;
        return (
          <section key={risk} aria-labelledby={`review-risk-${risk}`}>
            <div className="mb-2 flex items-center gap-2">
              {risk === 'removal' ? (
                <CircleMinusIcon className="size-4 text-warning" aria-hidden="true" />
              ) : (
                <CirclePlusIcon className="size-4 text-primary" aria-hidden="true" />
              )}
              <h3 id={`review-risk-${risk}`} className="font-medium text-body">
                {t(`organizationTasks.review.risk.${risk}`)}
              </h3>
            </div>
            <div className="divide-y overflow-hidden rounded-lg border bg-card">
              {groups.map((group) => (
                <ReviewGroup key={group.key} task={task} review={review} group={group} />
              ))}
            </div>
          </section>
        );
      })}

      {review.conflicts.length > 0 || review.uncertainties.length > 0 ? (
        <section aria-labelledby="review-no-op" className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h3 id="review-no-op" className="font-medium text-body">
                {t('organizationTasks.review.noOp')}
              </h3>
              <p className="mt-1 text-caption text-muted-foreground">
                {t('organizationTasks.review.noOpDescription', {
                  conflicts: review.conflicts.length,
                  uncertainties: review.uncertainties.length,
                })}
              </p>
              <details className="mt-3 border-t pt-3">
                <summary className="cursor-pointer select-none text-caption text-link outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  {t('organizationTasks.review.noOpItems', {
                    count: review.conflicts.length + review.uncertainties.length,
                  })}
                </summary>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-caption text-muted-foreground">
                  {review.conflicts.map((conflict) => (
                    <li key={`${conflict.relationType}:${conflict.names.join(':')}`}>
                      {t('organizationTasks.review.noOpDetail.near_duplicate_names', {
                        names: conflict.names.join(', '),
                        repositories: conflict.repoIds.join(', '),
                      })}
                    </li>
                  ))}
                  {review.uncertainties.map((uncertainty) => {
                    const pages = uncertainty.pageIndexes.join(', ');
                    const detail = uncertainty.detail;
                    const values =
                      detail.kind === 'unknown_repository'
                        ? { repoId: detail.repoId, pages }
                        : detail.kind === 'invalid_classification_name'
                          ? { name: detail.name, pages }
                          : detail.kind === 'unknown_target'
                            ? {
                                relationType: detail.relationType,
                                targetId: detail.targetId,
                                pages,
                              }
                            : {
                                repoId: detail.repoId,
                                relationType: detail.relationType,
                                targetId: detail.targetId,
                                pages,
                              };
                    return (
                      <li key={`${detail.kind}:${uncertainty.pageIndexes.join(':')}`}>
                        {t(`organizationTasks.review.noOpDetail.${detail.kind}`, values)}
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="review-confirm" className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h3 id="review-confirm" className="font-medium text-body">
              {t('organizationTasks.review.exactEffects')}
            </h3>
            <dl
              aria-live="polite"
              aria-atomic="true"
              className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-caption"
            >
              {(['newClassifications', 'additions', 'removals', 'noOps'] as const).map((key) => (
                <div key={key}>
                  <dt className="text-muted-foreground">
                    {t(`organizationTasks.review.counts.${key}`)}
                  </dt>
                  <dd className="mt-0.5 font-mono font-medium text-foreground">
                    {review.counts[key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <Button
            className="min-w-44"
            disabled={!review.confirmable || confirm.isPending}
            aria-busy={confirm.isPending}
            onClick={() =>
              confirm.mutate({
                taskId: task.id,
                expectedRevision: task.revision,
                planRevision: review.planRevision,
                planFingerprint: review.planFingerprint,
                groupFingerprints: review.approvedGroupFingerprints,
                counts: review.counts,
              })
            }
          >
            {confirm.isPending ? (
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
            )}
            {confirm.isPending
              ? t('organizationTasks.review.confirming')
              : t('organizationTasks.review.confirm')}
          </Button>
        </div>
        {!review.confirmable ? (
          <p role="alert" className="mt-3 text-caption text-warning">
            {t('organizationTasks.review.notConfirmable')}
          </p>
        ) : null}
        <MutationError error={confirm.error} />
      </section>
    </section>
  );
}

function ExecutionPanel({ task }: { task: OrganizationTask }) {
  const { t } = useTranslation();
  const execution = task.execution;
  if (!execution) return null;
  const settled = execution.succeeded + execution.terminalFailed + execution.dismissed;
  return (
    <section aria-labelledby="organization-execution" className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        {execution.operationStatus === 'completed' ? (
          <ClipboardCheckIcon className="mt-0.5 size-5 text-success" aria-hidden="true" />
        ) : (
          <LoaderCircleIcon
            className="mt-0.5 size-5 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 id="organization-execution" className="font-semibold text-section-title">
            {t('organizationTasks.execution.title')}
          </h2>
          <p className="mt-1 text-body text-muted-foreground">
            {t(`organizationTasks.execution.status.${execution.operationStatus}`)}
          </p>
          <div className="mt-4">
            <GenerationProgressBar value={settled} max={execution.total} />
          </div>
          <dl className="mt-4 grid gap-3 text-caption sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                'succeeded',
                'retryableFailed',
                'terminalFailed',
                'dismissed',
                'pending',
                'running',
              ] as const
            ).map((key) => (
              <div key={key}>
                <dt className="text-muted-foreground">
                  {t(`organizationTasks.execution.counts.${key}`)}
                </dt>
                <dd className="mt-0.5 font-mono font-medium">{execution[key]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 font-mono text-micro text-muted-foreground">
            {t('organizationTasks.execution.operation', { id: execution.operationId })}
          </p>
        </div>
      </div>
    </section>
  );
}

function TaskExecutionControls({ task }: { task: OrganizationTask }) {
  const operations = useBulkOperations();
  const actions = useBulkOperationActions();
  const resumedOperationRef = useRef<string | null>(null);
  const operation = operations.data?.find((item) => item.id === task.execution?.operationId);

  useEffect(() => {
    if (!operation || resumedOperationRef.current === operation.id) return;
    const hasPending = operation.items.some(
      (item) => item.status === 'pending' || item.status === 'running',
    );
    if (!hasPending) return;
    resumedOperationRef.current = operation.id;
    actions.resume.mutate(operation);
  }, [operation, actions.resume]);

  if (!operation || operation.status === 'completed') return null;
  return (
    <BulkOperationBanner
      operation={operation}
      resuming={actions.resume.isPending}
      retrying={actions.retry.isPending}
      completing={actions.complete.isPending}
      onResume={() => actions.resume.mutate(operation)}
      onRetry={() => actions.retry.mutate(operation)}
      onComplete={() => actions.complete.mutate(operation)}
    />
  );
}

function GenerationPanel({ task }: { task: OrganizationTask }) {
  const { t } = useTranslation();
  const start = useStartOrganizationGeneration();
  const pause = usePauseOrganizationGeneration();
  const resume = useResumeOrganizationGeneration();
  const retry = useRetryOrganizationGeneration();
  const runPage = useRunOrganizationGenerationPage();
  const [halt, setHalt] = useState<string | null>(null);
  const runningRef = useRef(false);

  const taskId = task.id;
  const revision = task.revision;
  const status = task.status;
  const isGenerating = status === 'generating';
  const runMutate = runPage.mutateAsync;
  const runPending = runPage.isPending;

  // The client owns the bounded pagination loop: advance exactly one page per
  // settled call while generating, and halt on any non-success outcome so
  // ceilings, drift, single-page failures, and hand-off to another session
  // never spin it. `runningRef` blocks re-entry (including StrictMode remounts);
  // the settled `runPending` transition re-arms the loop for the next page.
  useEffect(() => {
    if (!isGenerating) {
      setHalt(null);
      return;
    }
    if (halt !== null || runPending || runningRef.current) return;
    runningRef.current = true;
    runMutate({ taskId })
      .then((result) => {
        if (result.run.outcome !== 'page_succeeded') setHalt(result.run.outcome);
      })
      .catch(() => setHalt('page_failed'))
      .finally(() => {
        runningRef.current = false;
      });
  }, [isGenerating, taskId, halt, runPending, runMutate]);

  const controlError = start.error ?? pause.error ?? resume.error ?? retry.error ?? runPage.error;

  if (status === 'generation_approved') {
    return (
      <section
        aria-labelledby="generation-start"
        className="flex flex-col gap-4 rounded-lg border bg-card p-5"
      >
        <div className="flex items-start gap-3">
          <SparklesIcon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 id="generation-start" className="font-semibold text-section-title">
              {t('organizationTasks.generation.startTitle')}
            </h2>
            <p className="mt-1 text-body text-muted-foreground">
              {t('organizationTasks.generation.startDescription')}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            className="min-w-44"
            disabled={start.isPending}
            aria-busy={start.isPending}
            onClick={() => start.mutate({ taskId, expectedRevision: revision })}
          >
            {start.isPending ? (
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <PlayIcon className="size-4" aria-hidden="true" />
            )}
            {start.isPending
              ? t('organizationTasks.generation.starting')
              : t('organizationTasks.generation.start')}
          </Button>
        </div>
        <MutationError error={controlError} />
      </section>
    );
  }

  if (status === 'plan_ready') {
    const plan = task.plans[0];
    return (
      <>
        <section
          aria-labelledby="generation-plan"
          className="flex flex-col gap-4 rounded-lg border bg-card p-5"
        >
          <div className="flex items-start gap-3">
            <ClipboardCheckIcon className="mt-0.5 size-5 text-success" aria-hidden="true" />
            <div>
              <h2 id="generation-plan" className="font-semibold text-section-title">
                {t('organizationTasks.plan.title')}
              </h2>
              <p className="mt-1 text-body text-muted-foreground">
                {t('organizationTasks.plan.description')}
              </p>
            </div>
          </div>
          {plan ? (
            <dl className="grid gap-x-6 gap-y-4 text-body sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-caption text-muted-foreground">
                  {t('organizationTasks.plan.revision')}
                </dt>
                <dd className="mt-1 font-mono font-medium">{plan.revision}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">
                  {t('organizationTasks.plan.actions')}
                </dt>
                <dd className="mt-1 font-medium">{plan.actionCount}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">
                  {t('organizationTasks.plan.conflicts')}
                </dt>
                <dd className="mt-1 font-medium">{plan.conflictCount}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">
                  {t('organizationTasks.plan.uncertainties')}
                </dt>
                <dd className="mt-1 font-medium">{plan.uncertaintyCount}</dd>
              </div>
            </dl>
          ) : null}
        </section>
        <PlanReviewPanel task={task} />
      </>
    );
  }

  const run = task.generationRun;
  if (!run || !(isGenerating || status === 'generation_paused' || status === 'needs_attention')) {
    return null;
  }
  const done = run.pages.filter((page) => page.status === 'succeeded').length;
  const total = run.pages.length;
  const leasedPage = run.pages.find((page) => page.status === 'leased');
  const checkpoint = leasedPage ?? run.pages.find((page) => page.status === 'pending');
  const failedPage = run.pages.find((page) => page.status === 'failed');
  const failedPageCanRetry =
    failedPage === undefined || failedPage.attemptCount < run.maxAttemptsPerPage;
  const failedReason = (() => {
    const code = failedPage?.errorCode;
    if (code === 'provider_output_truncated') return 'provider_output_truncated';
    if (code === 'schema_mismatch') return 'schema_mismatch';
    if (code === 'provider_network_error' || code === 'provider_timeout') return 'provider_network';
    if (code?.startsWith('provider_http_')) return 'provider_http';
    return 'provider_failed';
  })();

  return (
    <section
      aria-labelledby="generation-progress"
      className="flex flex-col gap-5 rounded-lg border bg-card p-5"
    >
      <div>
        <h2 id="generation-progress" className="font-semibold text-section-title">
          {t('organizationTasks.generation.title')}
        </h2>
        <p className="mt-1 text-body text-muted-foreground">
          {t('organizationTasks.generation.description')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-caption">
          <span className="text-muted-foreground">{t('organizationTasks.generation.pages')}</span>
          <span className="font-mono font-medium">
            {t('organizationTasks.generation.pagesValue', { done, total })}
          </span>
        </div>
        <GenerationProgressBar value={done} max={total} />
        <dl className="grid gap-x-6 gap-y-4 text-body sm:grid-cols-3">
          <div>
            <dt className="text-caption text-muted-foreground">
              {t('organizationTasks.generation.calls')}
            </dt>
            <dd className="mt-1 font-mono font-medium">
              {t('organizationTasks.generation.ratio', {
                used: run.callsUsed,
                max: run.maxTotalCalls,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">
              {t('organizationTasks.generation.tokens')}
            </dt>
            <dd className="mt-1 font-mono font-medium">
              {t('organizationTasks.generation.ratio', {
                used: run.tokensUsed.toLocaleString(),
                max: run.estimatedTokenCeiling.toLocaleString(),
              })}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">
              {t('organizationTasks.generation.checkpoint')}
            </dt>
            <dd className="mt-1 font-medium">
              {checkpoint
                ? t('organizationTasks.generation.checkpointPage', {
                    index: checkpoint.index,
                    total,
                  })
                : t('organizationTasks.generation.checkpointIdle')}
            </dd>
          </div>
        </dl>
      </div>

      <p aria-live="polite" className="sr-only">
        {isGenerating && runPending
          ? t('organizationTasks.generation.running', { index: checkpoint?.index ?? done, total })
          : t('organizationTasks.generation.liveProgress', { done, total })}
      </p>

      {status === 'needs_attention' ? (
        <div role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-caption">
                {t(
                  `organizationTasks.generation.attentionReason.${
                    task.attentionCode === 'page_failed' && !failedPageCanRetry
                      ? 'retry_exhausted'
                      : (task.attentionCode ?? 'retry_exhausted')
                  }`,
                )}
              </p>
              {failedPage ? (
                <div className="mt-3 flex flex-col gap-1.5 border-border border-t pt-3 text-caption">
                  <p>
                    {t('organizationTasks.generation.failedPage', {
                      index: failedPage.index,
                      total,
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    {t(`organizationTasks.generation.errorReason.${failedReason}`)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-muted-foreground">
                    <span>
                      {t('organizationTasks.generation.attempts', {
                        used: failedPage.attemptCount,
                        max: run.maxAttemptsPerPage,
                      })}
                    </span>
                    {failedPage.errorCode ? (
                      <span className="min-w-0 break-all font-mono">
                        {t('organizationTasks.generation.errorCode', {
                          code: failedPage.errorCode,
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isGenerating && halt === 'page_failed' ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3"
        >
          <AlertTriangleIcon className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-56 flex-1 text-caption">
            {t('organizationTasks.generation.pageFailed')}
          </p>
          <Button variant="outline" size="sm" disabled={runPending} onClick={() => setHalt(null)}>
            <RefreshCwIcon className="size-4" aria-hidden="true" />
            {t('organizationTasks.generation.continue')}
          </Button>
        </div>
      ) : null}

      {isGenerating && halt === 'in_flight' ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md bg-muted px-4 py-3"
        >
          <LoaderCircleIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-56 flex-1 text-caption text-muted-foreground">
            {t('organizationTasks.generation.inFlight')}
          </p>
          <Button variant="outline" size="sm" disabled={runPending} onClick={() => setHalt(null)}>
            <RefreshCwIcon className="size-4" aria-hidden="true" />
            {t('organizationTasks.generation.checkAgain')}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {isGenerating ? (
          <Button
            variant="outline"
            className="min-w-32"
            disabled={pause.isPending}
            aria-busy={pause.isPending}
            onClick={() => pause.mutate({ taskId, expectedRevision: revision })}
          >
            {pause.isPending ? (
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <PauseIcon className="size-4" aria-hidden="true" />
            )}
            {pause.isPending
              ? t('organizationTasks.generation.pausing')
              : t('organizationTasks.generation.pause')}
          </Button>
        ) : null}
        {status === 'generation_paused' ? (
          <Button
            className="min-w-32"
            disabled={resume.isPending}
            aria-busy={resume.isPending}
            onClick={() => resume.mutate({ taskId, expectedRevision: revision })}
          >
            {resume.isPending ? (
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <PlayIcon className="size-4" aria-hidden="true" />
            )}
            {resume.isPending
              ? t('organizationTasks.generation.resuming')
              : t('organizationTasks.generation.resume')}
          </Button>
        ) : null}
        {status === 'needs_attention' && failedPageCanRetry ? (
          <Button
            className="min-w-40"
            disabled={retry.isPending}
            aria-busy={retry.isPending}
            onClick={() => retry.mutate({ taskId, expectedRevision: revision })}
          >
            {retry.isPending ? (
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <RefreshCwIcon className="size-4" aria-hidden="true" />
            )}
            {retry.isPending
              ? t('organizationTasks.generation.retrying')
              : t('organizationTasks.generation.retry')}
          </Button>
        ) : null}
      </div>

      {status === 'generation_paused' ? (
        <p className="text-caption text-muted-foreground">
          {t('organizationTasks.generation.paused')}
        </p>
      ) : null}

      <MutationError error={controlError} />
    </section>
  );
}

export function OrganizationTaskDetailPage() {
  const { t } = useTranslation();
  const { taskId } = useParams();
  const taskQuery = useOrganizationTask(taskId);
  const repos = useStarredRepos();
  const updateGoal = useUpdateOrganizationTaskGoal();
  const discover = useDiscoverOrganizationTask();
  const exclude = useExcludeOrganizationCandidate();
  const approve = useApproveOrganizationGeneration();
  const endTask = useEndOrganizationTask();
  const [goal, setGoal] = useState('');
  const [revisingGoal, setRevisingGoal] = useState(false);
  const [endArmed, setEndArmed] = useState(false);
  const task = taskQuery.data;
  const names = useMemo(
    () => new Map(repos.data?.map((item) => [item.repoId, item.repo.fullName]) ?? []),
    [repos.data],
  );

  if (taskQuery.isLoading) {
    return (
      <div
        role="status"
        aria-label={t('organizationTasks.detail.loading')}
        className="mx-auto flex w-full max-w-5xl flex-col gap-4"
      >
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (taskQuery.isError || !task) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <QueryError
          message={t('organizationTasks.errors.task_load_failed')}
          retry={() => void taskQuery.refetch()}
        />
        <Link className="text-caption text-link hover:underline" to="/organization">
          {t('organizationTasks.detail.back')}
        </Link>
      </div>
    );
  }
  const pending =
    updateGoal.isPending ||
    discover.isPending ||
    exclude.isPending ||
    approve.isPending ||
    endTask.isPending;
  const mutationError =
    updateGoal.error ?? discover.error ?? exclude.error ?? approve.error ?? endTask.error;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto pb-8">
      <nav aria-label={t('organizationTasks.detail.breadcrumb')}>
        <Link
          to="/organization"
          className="text-caption text-link outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {t('organizationTasks.title')}
        </Link>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="max-w-[70ch] font-bold text-page-title text-wrap-balance">{task.goal}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={task.status === 'ended' ? 'secondary' : 'outline'}>
              {t(`organizationTasks.status.${task.status}`)}
            </Badge>
            <span className="font-mono text-micro text-muted-foreground">
              {t('organizationTasks.detail.revision', { revision: task.revision })}
            </span>
          </div>
        </div>
        {task.status !== 'ended' && !task.execution ? (
          <Button
            variant={endArmed ? 'destructive' : 'ghost'}
            className="min-w-28"
            disabled={pending}
            aria-busy={endTask.isPending}
            onClick={() => {
              if (!endArmed) {
                setEndArmed(true);
                return;
              }
              endTask.mutate({ taskId: task.id, expectedRevision: task.revision });
            }}
          >
            {endTask.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <XIcon className="size-4" aria-hidden="true" />
            )}
            {endArmed
              ? t('organizationTasks.detail.confirmEnd')
              : t('organizationTasks.detail.end')}
          </Button>
        ) : null}
      </header>

      <p aria-live="polite" className="sr-only">
        {t(`organizationTasks.status.${task.status}`)}
      </p>
      <MutationError error={mutationError} />

      {task.status === 'clarifying' || revisingGoal ? (
        <section
          aria-labelledby="task-goal"
          className="flex flex-col gap-4 rounded-lg border bg-card p-5"
        >
          <div>
            <h2 id="task-goal" className="font-semibold text-section-title">
              {t('organizationTasks.detail.goalTitle')}
            </h2>
            <p className="mt-1 text-body text-muted-foreground">
              {t('organizationTasks.detail.goalDescription')}
            </p>
          </div>
          <Textarea
            aria-label={t('organizationTasks.create.goalLabel')}
            value={goal || task.goal}
            onChange={(event) => setGoal(event.target.value)}
            className="min-h-24 resize-y"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className="min-w-32"
              disabled={pending || !goal.trim() || goal.trim() === task.goal}
              aria-busy={updateGoal.isPending}
              onClick={() =>
                updateGoal.mutate(
                  {
                    taskId: task.id,
                    expectedRevision: task.revision,
                    goal: goal.trim(),
                    message: goal.trim(),
                  },
                  {
                    onSuccess: () => setRevisingGoal(false),
                  },
                )
              }
            >
              {updateGoal.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t('organizationTasks.detail.saveGoal')}
            </Button>
            {task.status === 'clarifying' ? (
              <Button
                className="min-w-44"
                disabled={pending}
                aria-busy={discover.isPending}
                onClick={() =>
                  discover.mutate({
                    taskId: task.id,
                    expectedRevision: task.revision,
                    goal: task.goal,
                  })
                }
              >
                {discover.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ListChecksIcon className="size-4" aria-hidden="true" />
                )}
                {discover.isPending
                  ? t('organizationTasks.detail.discovering')
                  : t('organizationTasks.detail.discover')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setRevisingGoal(false)}>
                {t('organizationTasks.detail.cancelRevision')}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {task.status === 'discovering' ? (
        <section
          aria-labelledby="task-discovery-recovery"
          className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-5"
        >
          <ListChecksIcon className="size-5 text-primary" aria-hidden="true" />
          <div className="min-w-60 flex-1">
            <h2 id="task-discovery-recovery" className="font-semibold text-section-title">
              {t('organizationTasks.detail.discoveryInterruptedTitle')}
            </h2>
            <p className="mt-1 text-body text-muted-foreground">
              {t('organizationTasks.detail.discoveryInterruptedDescription')}
            </p>
          </div>
          <Button
            className="min-w-40"
            disabled={pending}
            aria-busy={discover.isPending}
            onClick={() =>
              discover.mutate({
                taskId: task.id,
                expectedRevision: task.revision,
                goal: task.goal,
              })
            }
          >
            {discover.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {discover.isPending
              ? t('organizationTasks.detail.discovering')
              : t('organizationTasks.detail.resumeDiscovery')}
          </Button>
        </section>
      ) : null}

      {task.snapshot ? (
        <section aria-labelledby="candidate-snapshot" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="candidate-snapshot" className="font-semibold text-section-title">
                {t('organizationTasks.candidates.title', {
                  count: task.snapshot.candidateCount,
                })}
              </h2>
              <p className="mt-1 text-body text-muted-foreground">
                {t('organizationTasks.candidates.description', {
                  libraryCount: task.snapshot.libraryCount,
                })}
              </p>
            </div>
            {task.status === 'awaiting_generation_approval' && !revisingGoal ? (
              <Button variant="outline" onClick={() => setRevisingGoal(true)}>
                {t('organizationTasks.detail.reviseGoal')}
              </Button>
            ) : null}
          </div>
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {task.snapshot.items.map((item) => (
              <div key={item.repositoryId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono font-medium text-body">
                    {names.get(item.repositoryId) ?? item.repositoryId}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {item.reasons
                      .map((reason) =>
                        reason.kind === 'goal_term'
                          ? t('organizationTasks.candidates.reason.goalTerm', {
                              term: reason.value,
                            })
                          : reason.kind === 'derived_similarity'
                            ? t('organizationTasks.candidates.reason.derivedSimilarity', {
                                similarity: Math.round(reason.value * 100),
                              })
                            : t(`organizationTasks.candidates.reason.${reason.kind}`),
                      )
                      .join(' · ')}
                  </p>
                </div>
                {task.status === 'awaiting_generation_approval' && !revisingGoal ? (
                  <Button
                    variant="ghost"
                    className="min-w-24"
                    disabled={pending}
                    aria-busy={
                      exclude.isPending && exclude.variables?.repositoryId === item.repositoryId
                    }
                    aria-pressed={item.included}
                    onClick={() =>
                      exclude.mutate({
                        taskId: task.id,
                        expectedRevision: task.revision,
                        repositoryId: item.repositoryId,
                        excluded: item.included,
                      })
                    }
                  >
                    {exclude.isPending && exclude.variables?.repositoryId === item.repositoryId ? (
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {item.included
                      ? t('organizationTasks.candidates.exclude')
                      : t('organizationTasks.candidates.include')}
                  </Button>
                ) : (
                  <Badge variant={item.included ? 'secondary' : 'outline'}>
                    {item.included
                      ? t('organizationTasks.candidates.included')
                      : t('organizationTasks.candidates.excluded')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <WorkloadDisclosure task={task} />

      {task.execution ? (
        <>
          <ExecutionPanel task={task} />
          <TaskExecutionControls task={task} />
        </>
      ) : null}

      {task.status === 'awaiting_generation_approval' && task.manifest && !revisingGoal ? (
        <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[65ch] text-body text-muted-foreground">
              {t('organizationTasks.disclosure.approvalBinding')}
            </p>
            <Button
              className="min-w-44"
              disabled={pending}
              aria-busy={approve.isPending}
              onClick={() => approve.mutate({ taskId: task.id, expectedRevision: task.revision })}
            >
              {approve.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheckIcon className="size-4" aria-hidden="true" />
              )}
              {approve.isPending
                ? t('organizationTasks.disclosure.approving')
                : t('organizationTasks.disclosure.approve')}
            </Button>
          </div>
        </>
      ) : null}

      {!task.execution &&
      (task.status === 'generation_approved' ||
        task.status === 'generating' ||
        task.status === 'generation_paused' ||
        task.status === 'needs_attention' ||
        task.status === 'plan_ready') ? (
        <GenerationPanel task={task} />
      ) : null}

      {task.status === 'ended' ? (
        <section className="flex items-start gap-3 rounded-lg border bg-card p-5">
          <Clock3Icon className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-section-title">
              {t('organizationTasks.ended.title')}
            </h2>
            <p className="mt-1 text-body text-muted-foreground">
              {t('organizationTasks.ended.description')}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
