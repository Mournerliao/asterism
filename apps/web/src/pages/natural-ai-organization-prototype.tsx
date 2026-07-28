import { Badge, Button, cn, Separator, Textarea } from '@asterism/ui';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FolderPlusIcon,
  HistoryIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Undo2Icon,
  XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

type Variant = 'A' | 'B' | 'C';
type Scenario = 'first' | 'incremental';
type Stage = 'opportunity' | 'goal' | 'scope' | 'review' | 'result' | 'undone';

type PrototypeState = {
  stage: Stage;
  goal: string;
  excludedRepos: string[];
  newCategoryApproved: boolean;
  removalsApproved: boolean;
};

type PrototypeActions = {
  acceptOpportunity: () => void;
  explainScope: () => void;
  startReview: () => void;
  execute: () => void;
  undo: () => void;
  reset: () => void;
  setGoal: (goal: string) => void;
  toggleRepo: (repo: string) => void;
  toggleNewCategory: () => void;
  toggleRemovals: () => void;
};

type VariantProps = {
  scenario: Scenario;
  state: PrototypeState;
  actions: PrototypeActions;
  repos: string[];
};

const VARIANTS: Variant[] = ['A', 'B', 'C'];
const FALLBACK_REPOS = [
  'badlogic/pi-mono',
  'AntonOsika/gpt-engineer',
  'Pythagora-io/gpt-pilot',
  'cline/cline',
  'continuedev/continue',
  'Aider-AI/aider',
  'TabbyML/tabby',
  'All-Hands-AI/OpenHands',
];

function nextStage(stage: Stage): Stage {
  const stages: Stage[] = ['opportunity', 'goal', 'scope', 'review', 'result', 'undone'];
  return stages[Math.min(stages.indexOf(stage) + 1, stages.length - 1)] ?? stage;
}

function stageNumber(stage: Stage) {
  return ['opportunity', 'goal', 'scope', 'review', 'result', 'undone'].indexOf(stage) + 1;
}

function usePrototypeState(scenario: Scenario) {
  const { t } = useTranslation();
  const createInitial = useCallback(
    (): PrototypeState => ({
      stage: 'opportunity',
      goal: t(`naturalAiPrototype.scenario.${scenario}.defaultGoal`),
      excludedRepos: [],
      newCategoryApproved: false,
      removalsApproved: false,
    }),
    [scenario, t],
  );
  const [state, setState] = useState<PrototypeState>(createInitial);

  useEffect(() => {
    setState(createInitial());
  }, [createInitial]);

  const advance = () => setState((current) => ({ ...current, stage: nextStage(current.stage) }));
  const actions: PrototypeActions = {
    acceptOpportunity: advance,
    explainScope: advance,
    startReview: advance,
    execute: () => setState((current) => ({ ...current, stage: 'result' })),
    undo: () => setState((current) => ({ ...current, stage: 'undone' })),
    reset: () => setState(createInitial()),
    setGoal: (goal) => setState((current) => ({ ...current, goal })),
    toggleRepo: (repo) =>
      setState((current) => ({
        ...current,
        excludedRepos: current.excludedRepos.includes(repo)
          ? current.excludedRepos.filter((item) => item !== repo)
          : [...current.excludedRepos, repo],
      })),
    toggleNewCategory: () =>
      setState((current) => ({
        ...current,
        newCategoryApproved: !current.newCategoryApproved,
      })),
    toggleRemovals: () =>
      setState((current) => ({ ...current, removalsApproved: !current.removalsApproved })),
  };

  return { state, actions };
}

function ScenarioControl({
  scenario,
  onChange,
}: {
  scenario: Scenario;
  onChange: (scenario: Scenario) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
      {(['first', 'incremental'] as const).map((item) => (
        <Button
          key={item}
          size="sm"
          variant={scenario === item ? 'secondary' : 'ghost'}
          aria-pressed={scenario === item}
          onClick={() => onChange(item)}
        >
          {t(`naturalAiPrototype.scenario.${item}.label`)}
        </Button>
      ))}
    </div>
  );
}

function StateSurface({
  state,
  scenario,
  variant,
}: {
  state: PrototypeState;
  scenario: Scenario;
  variant: Variant;
}) {
  const { t } = useTranslation();
  return (
    <details className="rounded-lg bg-muted px-3 py-2 text-caption">
      <summary className="cursor-pointer font-medium">
        {t('naturalAiPrototype.state.title')}
      </summary>
      <pre className="mt-2 overflow-x-auto font-mono text-micro text-muted-foreground">
        {JSON.stringify({ variant, scenario, ...state }, null, 2)}
      </pre>
    </details>
  );
}

function GoalEditor({ state, actions }: Pick<VariantProps, 'state' | 'actions'>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <label className="font-medium text-body" htmlFor="prototype-goal">
        {t('naturalAiPrototype.goal.label')}
      </label>
      <Textarea
        id="prototype-goal"
        value={state.goal}
        onChange={(event) => actions.setGoal(event.target.value)}
        className="min-h-24 resize-none"
      />
      <div className="flex flex-wrap gap-2 text-caption text-muted-foreground">
        <span>{t('naturalAiPrototype.goal.hint')}</span>
        <button type="button" className="text-link hover:underline" onClick={actions.explainScope}>
          {t('naturalAiPrototype.goal.optionalScope')}
        </button>
      </div>
    </div>
  );
}

function ScopeExplanation({ scenario, repos }: Pick<VariantProps, 'scenario' | 'repos'>) {
  const { t } = useTranslation();
  const count = scenario === 'first' ? 186 : 7;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-drawer-title">
          {t('naturalAiPrototype.scope.title', { count })}
        </h3>
        <p className="mt-1 max-w-[68ch] text-body text-muted-foreground">
          {t(`naturalAiPrototype.scenario.${scenario}.scopeReason`)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {repos.slice(0, 5).map((repo) => (
          <Badge key={repo} variant="secondary" className="font-mono font-normal">
            {repo}
          </Badge>
        ))}
        <Badge variant="outline">{t('naturalAiPrototype.scope.more', { count: count - 5 })}</Badge>
      </div>
      <dl className="grid gap-3 text-caption sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{t('naturalAiPrototype.scope.provider')}</dt>
          <dd className="mt-1 font-medium">OpenAI · gpt-5-mini</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('naturalAiPrototype.scope.work')}</dt>
          <dd className="mt-1 font-medium">
            {t('naturalAiPrototype.scope.workValue', { count: scenario === 'first' ? 4 : 1 })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('naturalAiPrototype.scope.cost')}</dt>
          <dd className="mt-1 font-medium">{t(`naturalAiPrototype.scenario.${scenario}.cost`)}</dd>
        </div>
      </dl>
      <p className="rounded-md bg-muted px-3 py-2 text-caption text-muted-foreground">
        {t('naturalAiPrototype.scope.fields')}
      </p>
    </div>
  );
}

function ReviewGroups({
  state,
  actions,
  repos,
  scenario,
}: Pick<VariantProps, 'state' | 'actions' | 'repos' | 'scenario'>) {
  const { t } = useTranslation();
  const additions = 24 - state.excludedRepos.length;
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-primary/5 px-4 py-3 text-caption">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <CheckIcon className="size-4 text-success" />
          {t('naturalAiPrototype.review.taskReady')}
        </span>
        <span className="text-muted-foreground">
          {t('naturalAiPrototype.review.taskProgress', {
            count: scenario === 'first' ? 186 : 7,
            calls: scenario === 'first' ? 4 : 1,
          })}
        </span>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-body">
              {t('naturalAiPrototype.review.existingTitle')}
            </h3>
            <p className="text-caption text-muted-foreground">
              {t('naturalAiPrototype.review.existingDescription', { count: additions })}
            </p>
          </div>
          <Badge>{t('naturalAiPrototype.review.recommended')}</Badge>
        </div>
        <div className="overflow-hidden rounded-lg bg-card">
          {repos.slice(0, 4).map((repo) => {
            const excluded = state.excludedRepos.includes(repo);
            return (
              <button
                key={repo}
                type="button"
                aria-pressed={!excluded}
                onClick={() => actions.toggleRepo(repo)}
                className="flex min-h-11 w-full items-center gap-3 border-border border-b px-3 text-left text-body last:border-b-0 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-sm border',
                    excluded ? 'border-input' : 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {excluded ? null : <CheckIcon className="size-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{repo}</span>
                <span className="text-caption text-muted-foreground">
                  {t('naturalAiPrototype.review.targetExisting')}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-body">{t('naturalAiPrototype.review.newTitle')}</h3>
            <p className="text-caption text-muted-foreground">
              {t('naturalAiPrototype.review.newDescription')}
            </p>
          </div>
          <Button
            size="sm"
            variant={state.newCategoryApproved ? 'secondary' : 'outline'}
            onClick={actions.toggleNewCategory}
          >
            {state.newCategoryApproved
              ? t('naturalAiPrototype.review.approved')
              : t('naturalAiPrototype.review.approve')}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-caption">
          <FolderPlusIcon className="size-4 text-primary" />
          <strong>{t('naturalAiPrototype.review.newCategoryName')}</strong>
          <span className="text-muted-foreground">
            {t('naturalAiPrototype.review.representativeMembers', { count: 6 })}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/35 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-body">
              {t('naturalAiPrototype.review.removalTitle')}
            </h3>
            <p className="text-caption text-muted-foreground">
              {t('naturalAiPrototype.review.removalDescription', { count: 3 })}
            </p>
          </div>
          <Button
            size="sm"
            variant={state.removalsApproved ? 'destructive' : 'outline'}
            onClick={actions.toggleRemovals}
          >
            {state.removalsApproved
              ? t('naturalAiPrototype.review.removalsApproved')
              : t('naturalAiPrototype.review.reviewRemovals')}
          </Button>
        </div>
        <div className="overflow-hidden rounded-md bg-muted">
          {repos.slice(0, 3).map((repo) => (
            <div
              key={repo}
              className="flex min-h-10 items-center gap-3 border-border border-b px-3 text-caption last:border-b-0"
            >
              <XIcon className="size-3.5 text-destructive" />
              <span className="min-w-0 flex-1 truncate font-mono">{repo}</span>
              <span className="text-muted-foreground">
                {t('naturalAiPrototype.review.removalTarget')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultView({ state, actions }: Pick<VariantProps, 'state' | 'actions'>) {
  const { t } = useTranslation();
  const undone = state.stage === 'undone';
  const additions = 24 - state.excludedRepos.length;
  return (
    <div className="flex flex-col items-start gap-4 py-4">
      <span
        className={cn(
          'flex size-10 items-center justify-center rounded-full',
          undone ? 'bg-muted text-foreground' : 'bg-success/15 text-success',
        )}
      >
        {undone ? <HistoryIcon className="size-5" /> : <CheckIcon className="size-5" />}
      </span>
      <div>
        <h3 className="font-semibold text-section-title">
          {t(undone ? 'naturalAiPrototype.result.undoneTitle' : 'naturalAiPrototype.result.title')}
        </h3>
        <p className="mt-1 max-w-[68ch] text-body text-muted-foreground">
          {t(
            undone
              ? 'naturalAiPrototype.result.undoneDescription'
              : 'naturalAiPrototype.result.description',
          )}
        </p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 text-caption">
        <div>
          <dt className="text-muted-foreground">{t('naturalAiPrototype.result.added')}</dt>
          <dd className="mt-1 font-mono font-semibold">{undone ? 0 : additions}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('naturalAiPrototype.result.created')}</dt>
          <dd className="mt-1 font-mono font-semibold">
            {undone ? 0 : Number(state.newCategoryApproved)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('naturalAiPrototype.result.removed')}</dt>
          <dd className="mt-1 font-mono font-semibold">
            {undone ? 0 : state.removalsApproved ? 3 : 0}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {undone ? (
          <Button size="sm" variant="outline" onClick={actions.reset}>
            <RotateCcwIcon className="size-4" />
            {t('naturalAiPrototype.result.restart')}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={actions.undo}>
            <Undo2Icon className="size-4" />
            {t('naturalAiPrototype.result.undo')}
          </Button>
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        {t('naturalAiPrototype.result.categoryKept')}
      </p>
    </div>
  );
}

function PrimaryStage({ scenario, state, actions, repos }: VariantProps) {
  const { t } = useTranslation();
  if (state.stage === 'opportunity') {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SparklesIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-section-title">
            {t(`naturalAiPrototype.scenario.${scenario}.opportunityTitle`)}
          </h2>
          <p className="mt-1 max-w-[68ch] text-body text-muted-foreground">
            {t(`naturalAiPrototype.scenario.${scenario}.opportunityDescription`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={actions.acceptOpportunity}>
            {t('naturalAiPrototype.opportunity.accept')}
          </Button>
          <Button size="sm" variant="ghost">
            {t('naturalAiPrototype.opportunity.dismiss')}
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">
          {t('naturalAiPrototype.opportunity.noCost')}
        </p>
      </div>
    );
  }
  if (state.stage === 'goal') {
    return (
      <>
        <GoalEditor state={state} actions={actions} />
        <Button size="sm" className="mt-4" onClick={actions.explainScope}>
          <SearchIcon className="size-4" />
          {t('naturalAiPrototype.goal.findCandidates')}
        </Button>
      </>
    );
  }
  if (state.stage === 'scope') {
    return (
      <>
        <ScopeExplanation scenario={scenario} repos={repos} />
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={actions.startReview}>
            <SparklesIcon className="size-4" />
            {t('naturalAiPrototype.scope.start')}
          </Button>
          <Button size="sm" variant="outline" onClick={actions.reset}>
            {t('naturalAiPrototype.scope.adjust')}
          </Button>
        </div>
      </>
    );
  }
  if (state.stage === 'review') {
    return (
      <>
        <ReviewGroups state={state} actions={actions} repos={repos} scenario={scenario} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-muted-foreground">
            {t('naturalAiPrototype.review.finalCount', {
              additions: 24 - state.excludedRepos.length,
              categories: state.newCategoryApproved ? 1 : 0,
              removals: state.removalsApproved ? 3 : 0,
            })}
          </p>
          <Button size="sm" onClick={actions.execute}>
            <ShieldCheckIcon className="size-4" />
            {t('naturalAiPrototype.review.execute')}
          </Button>
        </div>
      </>
    );
  }
  return <ResultView state={state} actions={actions} />;
}

function VariantA(props: VariantProps) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <section className="min-w-0 rounded-xl bg-card p-5">
        <PrimaryStage {...props} />
      </section>
      <aside className="flex flex-col gap-4">
        <div className="rounded-xl bg-card p-4">
          <h2 className="font-semibold text-body">{t('naturalAiPrototype.a.journey')}</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {(['opportunity', 'goal', 'scope', 'review', 'result'] as const).map((stage, index) => {
              const active = stageNumber(props.state.stage) >= index + 1;
              return (
                <li key={stage} className="flex items-center gap-2 text-caption">
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full font-mono text-micro',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className={active ? 'text-foreground' : 'text-muted-foreground'}>
                    {t(`naturalAiPrototype.stage.${stage}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <StateSurface state={props.state} scenario={props.scenario} variant="A" />
      </aside>
    </div>
  );
}

function VariantB(props: VariantProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3 px-1">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MessageSquareTextIcon className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold text-body">{t('naturalAiPrototype.b.title')}</h2>
          <p className="text-caption text-muted-foreground">{t('naturalAiPrototype.b.status')}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-5">
        <div className="max-w-[85%] rounded-lg bg-muted px-4 py-3 text-body">
          {t(`naturalAiPrototype.scenario.${props.scenario}.assistantOpening`)}
        </div>
        {props.state.stage !== 'opportunity' ? (
          <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-4 py-3 text-body text-primary-foreground">
            {props.state.goal}
          </div>
        ) : null}
        {props.state.stage === 'opportunity' ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={props.actions.acceptOpportunity}>
              {t('naturalAiPrototype.opportunity.accept')}
            </Button>
            <Button size="sm" variant="ghost">
              {t('naturalAiPrototype.opportunity.dismiss')}
            </Button>
          </div>
        ) : props.state.stage === 'goal' ? (
          <div className="mt-2">
            <GoalEditor state={props.state} actions={props.actions} />
            <Button size="sm" className="mt-3" onClick={props.actions.explainScope}>
              {t('naturalAiPrototype.goal.findCandidates')}
            </Button>
          </div>
        ) : props.state.stage === 'scope' ? (
          <div className="mt-2 rounded-lg bg-background p-4">
            <ScopeExplanation scenario={props.scenario} repos={props.repos} />
            <Button size="sm" className="mt-4" onClick={props.actions.startReview}>
              {t('naturalAiPrototype.scope.start')}
            </Button>
          </div>
        ) : props.state.stage === 'review' ? (
          <div className="mt-2">
            <p className="mb-3 text-body">{t('naturalAiPrototype.b.planReady')}</p>
            <ReviewGroups
              state={props.state}
              actions={props.actions}
              repos={props.repos}
              scenario={props.scenario}
            />
            <Button size="sm" className="mt-4" onClick={props.actions.execute}>
              {t('naturalAiPrototype.review.execute')}
            </Button>
          </div>
        ) : (
          <ResultView state={props.state} actions={props.actions} />
        )}
      </div>
      <StateSurface state={props.state} scenario={props.scenario} variant="B" />
    </div>
  );
}

function VariantC(props: VariantProps) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-[32rem] overflow-hidden rounded-xl bg-card lg:grid-cols-[14rem_minmax(0,1fr)_16rem]">
      <aside className="border-border border-b bg-muted/55 p-4 lg:border-r lg:border-b-0">
        <h2 className="font-semibold text-body">{t('naturalAiPrototype.c.queue')}</h2>
        <button
          type="button"
          onClick={props.actions.acceptOpportunity}
          className="mt-3 w-full rounded-lg bg-card p-3 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex items-center gap-2 text-caption">
            <SparklesIcon className="size-4 text-primary" />
            <strong>{t(`naturalAiPrototype.scenario.${props.scenario}.shortTitle`)}</strong>
          </div>
          <p className="mt-2 text-caption text-muted-foreground">
            {t(`naturalAiPrototype.scenario.${props.scenario}.shortDescription`)}
          </p>
        </button>
        <p className="mt-4 text-micro text-muted-foreground">
          {t('naturalAiPrototype.c.optional')}
        </p>
      </aside>
      <main className="min-w-0 p-5">
        <div className="mb-5 flex items-center gap-2 text-caption text-muted-foreground">
          <ListChecksIcon className="size-4" />
          {t('naturalAiPrototype.c.stage', {
            stage: t(
              `naturalAiPrototype.stage.${props.state.stage === 'undone' ? 'result' : props.state.stage}`,
            ),
          })}
        </div>
        <PrimaryStage {...props} />
      </main>
      <aside className="border-border border-t p-4 lg:border-t-0 lg:border-l">
        <h2 className="font-semibold text-body">{t('naturalAiPrototype.c.inspector')}</h2>
        <dl className="mt-3 flex flex-col gap-3 text-caption">
          <div>
            <dt className="text-muted-foreground">{t('naturalAiPrototype.c.scope')}</dt>
            <dd className="mt-1 font-medium">
              {t(`naturalAiPrototype.scenario.${props.scenario}.scopeSummary`)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('naturalAiPrototype.c.canonical')}</dt>
            <dd className="mt-1 font-medium">
              {t('naturalAiPrototype.c.canonicalValue', {
                count: props.state.stage === 'result' ? 28 : 0,
              })}
            </dd>
          </div>
        </dl>
        <Separator className="my-4" />
        <StateSurface state={props.state} scenario={props.scenario} variant="C" />
      </aside>
    </div>
  );
}

function PrototypeSwitcher({
  variant,
  onChange,
}: {
  variant: Variant;
  onChange: (variant: Variant) => void;
}) {
  const { t } = useTranslation();
  const cycle = (direction: -1 | 1) => {
    const index = VARIANTS.indexOf(variant);
    onChange(VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length] ?? 'A');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, [contenteditable="true"]') ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
        return;
      }
      event.preventDefault();
      cycle(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-1.5 py-1.5 text-background shadow-md">
      <Button
        size="icon-sm"
        variant="ghost"
        className="rounded-full text-background hover:bg-background/15 hover:text-background"
        aria-label={t('naturalAiPrototype.switcher.previous')}
        onClick={() => cycle(-1)}
      >
        <ArrowLeftIcon className="size-4" />
      </Button>
      <span className="min-w-40 px-2 text-center font-medium text-caption">
        {variant} — {t(`naturalAiPrototype.variant.${variant}`)}
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        className="rounded-full text-background hover:bg-background/15 hover:text-background"
        aria-label={t('naturalAiPrototype.switcher.next')}
        onClick={() => cycle(1)}
      >
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  );
}

export function NaturalAiOrganizationPrototype({ repoNames }: { repoNames: string[] }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = VARIANTS.includes(searchParams.get('variant') as Variant)
    ? (searchParams.get('variant') as Variant)
    : 'A';
  const scenario: Scenario =
    searchParams.get('scenario') === 'incremental' ? 'incremental' : 'first';
  const { state, actions } = usePrototypeState(scenario);
  const repos = useMemo(() => {
    const unique = [...new Set(repoNames.filter(Boolean))];
    return [...unique, ...FALLBACK_REPOS.filter((repo) => !unique.includes(repo))].slice(0, 8);
  }, [repoNames]);
  const props = { scenario, state, actions, repos };

  const updateParam = (key: 'variant' | 'scenario', value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('prototype', 'natural-ai');
    next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="-m-6 min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{t('naturalAiPrototype.throwaway')}</Badge>
              <span className="text-caption text-muted-foreground">
                {t('naturalAiPrototype.question')}
              </span>
            </div>
            <h1 className="mt-2 font-bold text-page-title">{t('naturalAiPrototype.title')}</h1>
            <p className="mt-1 max-w-[70ch] text-body text-muted-foreground">
              {t('naturalAiPrototype.description')}
            </p>
          </div>
          <ScenarioControl scenario={scenario} onChange={(next) => updateParam('scenario', next)} />
        </header>
        {variant === 'A' ? <VariantA {...props} /> : null}
        {variant === 'B' ? <VariantB {...props} /> : null}
        {variant === 'C' ? <VariantC {...props} /> : null}
      </div>
      {import.meta.env.DEV ? (
        <PrototypeSwitcher variant={variant} onChange={(next) => updateParam('variant', next)} />
      ) : null}
    </div>
  );
}
