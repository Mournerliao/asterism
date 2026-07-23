import type {
  AiConnection,
  AiOrganizationDraft,
  AiOrganizationReviewChange,
  AiOrganizationReviewUpdateResult,
} from '@asterism/db';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@asterism/ui';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const AI_ORGANIZATION_REPO_LIMIT = 50;
export const AI_ORGANIZATION_NOTE_LIMIT = 2_000;

export function AiOrganizationPreflight({
  selectedRepoIds,
  connection,
  model,
  includeNotes,
  existingDraft,
  pending,
  onGenerate,
}: {
  selectedRepoIds: readonly string[];
  connection: AiConnection | null;
  model: string | null;
  includeNotes: boolean;
  existingDraft: AiOrganizationDraft | null;
  pending: boolean;
  onGenerate: (repoIds: string[]) => Promise<unknown>;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const count = selectedRepoIds.length;
  const overLimit = count > AI_ORGANIZATION_REPO_LIMIT;
  const unavailable = !connection || !model;
  const invalidScope = count === 0 || overLimit;
  const noteLimit = new Intl.NumberFormat(i18n.language).format(AI_ORGANIZATION_NOTE_LIMIT);

  const generate = async () => {
    setFailed(false);
    try {
      await onGenerate([...selectedRepoIds]);
      setOpen(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <SparklesIcon className="size-4" />
        {t('aiOrganization.action')}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent closeDisabled={pending}>
          <DialogHeader className="pr-10">
            <DialogTitle>{t('aiOrganization.preflight.title')}</DialogTitle>
            <DialogDescription>
              {t('aiOrganization.preflight.description', { count })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-body">
            {count === 0 ? (
              <p role="alert" className="flex items-start gap-2 text-warning">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                {t('aiOrganization.preflight.zero')}
              </p>
            ) : null}
            {overLimit ? (
              <p role="alert" className="flex items-start gap-2 text-warning">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                {t('aiOrganization.preflight.overLimit', {
                  count,
                  limit: AI_ORGANIZATION_REPO_LIMIT,
                })}
              </p>
            ) : null}
            {unavailable ? (
              <p role="alert" className="flex items-start gap-2 text-warning">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                {t('aiOrganization.preflight.noConnection')}
              </p>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border bg-card p-3">
                <dt className="text-muted-foreground">{t('aiOrganization.provider')}</dt>
                <dd className="min-w-0 truncate font-medium">{connection.name}</dd>
                <dt className="text-muted-foreground">{t('aiOrganization.model')}</dt>
                <dd className="min-w-0 truncate font-mono">{model}</dd>
              </dl>
            )}
            <section aria-labelledby="ai-fields-heading">
              <h3 id="ai-fields-heading" className="font-medium text-caption">
                {t('aiOrganization.preflight.fieldsTitle')}
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-caption text-muted-foreground">
                <li>{t('aiOrganization.preflight.repoFields')}</li>
                <li>{t('aiOrganization.preflight.organizationFields')}</li>
                <li>
                  {includeNotes
                    ? t('aiOrganization.preflight.notesIncluded', {
                        limit: noteLimit,
                      })
                    : t('aiOrganization.preflight.notesExcluded')}
                </li>
                <li>{t('aiOrganization.preflight.readmeExcluded')}</li>
              </ul>
            </section>
            {existingDraft ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-caption">
                {t('aiOrganization.preflight.replaceWarning')}
              </p>
            ) : null}
            {failed ? (
              <p role="alert" className="text-caption text-destructive">
                {t('aiOrganization.generateError')}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || invalidScope || unavailable}
              aria-busy={pending}
              onClick={generate}
            >
              {pending ? (
                <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              {pending ? t('aiOrganization.generating') : t('aiOrganization.generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionHeading({
  id,
  level = 4,
  title,
  icon: Icon,
  count,
}: {
  id?: string;
  level?: 3 | 4 | 5;
  title: string;
  icon: typeof PlusIcon;
  count: number;
}) {
  const Heading = level === 3 ? 'h3' : level === 5 ? 'h5' : 'h4';
  return (
    <Heading id={id} className="flex items-center gap-2 font-medium text-caption">
      <Icon className="size-4" aria-hidden="true" />
      {title}
      <Badge variant="secondary">{count}</Badge>
    </Heading>
  );
}

export function AiOrganizationDraftDialog({
  draft,
  open,
  onOpenChange,
  repoNames,
  targetNames,
  discarding,
  updatingReviewId,
  onUpdate,
  onDiscard,
}: {
  draft: AiOrganizationDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoNames: ReadonlyMap<string, string>;
  targetNames: ReadonlyMap<string, string>;
  discarding: boolean;
  updatingReviewId: string | null;
  onUpdate: (input: {
    expectedRevision: number;
    change: AiOrganizationReviewChange;
  }) => Promise<AiOrganizationReviewUpdateResult>;
  onDiscard: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [discardFailed, setDiscardFailed] = useState(false);
  const [reviewError, setReviewError] = useState<'conflict' | 'failed' | null>(null);
  const empty =
    draft.suggestions.relationChanges.length + draft.suggestions.newClassifications.length === 0;
  const reviewPending = updatingReviewId !== null;

  const update = async (change: AiOrganizationReviewChange) => {
    setReviewError(null);
    try {
      const result = await onUpdate({ expectedRevision: draft.revision, change });
      if (result.status === 'conflict') setReviewError('conflict');
    } catch {
      setReviewError('failed');
    }
  };

  const relationRow = (
    item: AiOrganizationDraft['suggestions']['relationChanges'][number],
    repoName: string,
  ) => {
    const targetName = targetNames.get(item.targetId) ?? item.targetId;
    const actionLabel = t(`aiOrganization.draft.${item.action}`);
    const controlLabel = item.selected
      ? t(`aiOrganization.draft.cancel.${item.action}`, { target: targetName, repo: repoName })
      : t(`aiOrganization.draft.restore.${item.action}`, { target: targetName, repo: repoName });
    return (
      <li
        key={item.id}
        className="flex flex-col gap-2 rounded-md border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-caption">
          <Badge variant="outline">
            {item.action === 'add' ? (
              <PlusIcon className="size-3" aria-hidden="true" />
            ) : (
              <MinusIcon className="size-3" aria-hidden="true" />
            )}
            {actionLabel}
          </Badge>
          <span className="min-w-0 truncate font-medium">{targetName}</span>
          <span className="text-muted-foreground">
            {t(`aiOrganization.kind.${item.relationType}`)}
          </span>
          <span className={item.selected ? 'text-success' : 'text-muted-foreground'}>
            {item.selected
              ? t('aiOrganization.draft.included')
              : t('aiOrganization.draft.cancelled')}
          </span>
        </div>
        <Button
          type="button"
          size="xs"
          variant={item.selected ? 'outline' : 'ghost'}
          aria-label={controlLabel}
          aria-pressed={item.selected}
          aria-busy={updatingReviewId === item.id}
          disabled={reviewPending}
          onClick={() =>
            update({
              kind: 'relation',
              suggestionId: item.id,
              selected: !item.selected,
            })
          }
        >
          {updatingReviewId === item.id ? (
            <LoaderCircleIcon className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : item.selected ? (
            <XIcon className="size-3.5" />
          ) : (
            <RotateCcwIcon className="size-3.5" />
          )}
          {item.selected
            ? t('aiOrganization.draft.cancelAction')
            : t('aiOrganization.draft.restoreAction')}
        </Button>
      </li>
    );
  };

  const discard = async () => {
    setDiscardFailed(false);
    try {
      await onDiscard();
      onOpenChange(false);
    } catch {
      setDiscardFailed(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !discarding && !reviewPending && onOpenChange(next)}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col"
        closeDisabled={discarding || reviewPending}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{t('aiOrganization.draft.title')}</DialogTitle>
          <DialogDescription>
            {t('aiOrganization.draft.description', {
              count: draft.sourceRepoIds.length,
              provider: draft.generationAdapter,
              model: draft.generationModel,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {empty ? (
            <div className="rounded-lg border bg-card p-4" role="status">
              <p className="font-medium text-body">{t('aiOrganization.draft.noChangesTitle')}</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {t('aiOrganization.draft.noChangesDescription')}
              </p>
            </div>
          ) : (
            <>
              <section aria-labelledby="ai-new-classifications-heading">
                <SectionHeading
                  id="ai-new-classifications-heading"
                  level={3}
                  title={t('aiOrganization.draft.newClassifications')}
                  icon={SparklesIcon}
                  count={draft.suggestions.newClassifications.length}
                />
                <p className="mt-1 text-caption text-muted-foreground">
                  {t('aiOrganization.draft.newClassificationsDescription')}
                </p>
                <ul className="mt-2 space-y-2">
                  {draft.suggestions.newClassifications.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 rounded-md border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-caption">
                        <span className="min-w-0 truncate font-medium">{item.name}</span>
                        <Badge variant="outline">
                          {t(`aiOrganization.kind.${item.relationType}`)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {t('aiOrganization.draft.repoCount', { count: item.repoIds.length })}
                        </span>
                        <span className={item.approved ? 'text-success' : 'text-muted-foreground'}>
                          {item.approved
                            ? t('aiOrganization.draft.approved')
                            : t('aiOrganization.draft.notApproved')}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant={item.approved ? 'outline' : 'default'}
                        aria-label={
                          item.approved
                            ? t('aiOrganization.draft.cancelApprovalLabel', {
                                kind: t(`aiOrganization.kind.${item.relationType}`).toLowerCase(),
                                name: item.name,
                              })
                            : t('aiOrganization.draft.approveLabel', {
                                kind: t(`aiOrganization.kind.${item.relationType}`).toLowerCase(),
                                name: item.name,
                              })
                        }
                        aria-pressed={item.approved}
                        aria-busy={updatingReviewId === item.id}
                        disabled={reviewPending}
                        onClick={() =>
                          update({
                            kind: 'classification',
                            suggestionId: item.id,
                            approved: !item.approved,
                          })
                        }
                      >
                        {updatingReviewId === item.id ? (
                          <LoaderCircleIcon className="size-3.5 animate-spin motion-reduce:animate-none" />
                        ) : item.approved ? (
                          <XIcon className="size-3.5" />
                        ) : (
                          <CheckCircle2Icon className="size-3.5" />
                        )}
                        {item.approved
                          ? t('aiOrganization.draft.cancelApproval')
                          : t('aiOrganization.draft.approve')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="ai-repositories-heading">
                <h3 id="ai-repositories-heading" className="font-medium text-body">
                  {t('aiOrganization.draft.repositories')}
                </h3>
                <div className="mt-3 space-y-4">
                  {draft.sourceRepoIds.map((repoId) => {
                    const repoName = repoNames.get(repoId) ?? repoId;
                    const additions = draft.suggestions.relationChanges.filter(
                      (item) => item.repoId === repoId && item.action === 'add',
                    );
                    const removals = draft.suggestions.relationChanges.filter(
                      (item) => item.repoId === repoId && item.action === 'remove',
                    );
                    const newClassifications = draft.suggestions.newClassifications.filter((item) =>
                      item.repoIds.includes(repoId),
                    );
                    if (additions.length + removals.length + newClassifications.length === 0) {
                      return null;
                    }
                    return (
                      <article key={repoId} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <h4 className="break-all font-medium text-body">{repoName}</h4>
                        <div className="mt-3 space-y-4">
                          {additions.length > 0 ? (
                            <section>
                              <SectionHeading
                                level={5}
                                title={t('aiOrganization.draft.additions')}
                                icon={PlusIcon}
                                count={additions.length}
                              />
                              <ul className="mt-2 space-y-2">
                                {additions.map((item) => relationRow(item, repoName))}
                              </ul>
                            </section>
                          ) : null}
                          {removals.length > 0 ? (
                            <section>
                              <SectionHeading
                                level={5}
                                title={t('aiOrganization.draft.removals')}
                                icon={MinusIcon}
                                count={removals.length}
                              />
                              <ul className="mt-2 space-y-2">
                                {removals.map((item) => relationRow(item, repoName))}
                              </ul>
                            </section>
                          ) : null}
                          {newClassifications.length > 0 ? (
                            <section>
                              <SectionHeading
                                level={5}
                                title={t('aiOrganization.draft.newClassifications')}
                                icon={SparklesIcon}
                                count={newClassifications.length}
                              />
                              <ul className="mt-2 space-y-2">
                                {newClassifications.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 text-caption"
                                  >
                                    <span className="font-medium">{item.name}</span>
                                    <Badge variant="outline">
                                      {t(`aiOrganization.kind.${item.relationType}`)}
                                    </Badge>
                                    <span
                                      className={
                                        item.approved ? 'text-success' : 'text-muted-foreground'
                                      }
                                    >
                                      {item.approved
                                        ? t('aiOrganization.draft.dependencyApproved')
                                        : t('aiOrganization.draft.dependencyBlocked')}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
          {reviewError ? (
            <p role="alert" className="flex items-start gap-2 text-caption text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              {reviewError === 'conflict'
                ? t('aiOrganization.draft.conflict')
                : t('aiOrganization.draft.reviewError')}
            </p>
          ) : null}
          {discardFailed ? (
            <p role="alert" className="text-caption text-destructive">
              {t('aiOrganization.discardError')}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={discarding || reviewPending}
            aria-busy={discarding}
            onClick={discard}
          >
            {discarding ? (
              <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Trash2Icon className="size-4" />
            )}
            {discarding ? t('aiOrganization.discarding') : t('aiOrganization.discard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AiOrganizationDraftBanner({
  draft,
  repoNames,
  targetNames,
  discarding,
  updatingReviewId,
  onUpdate,
  onDiscard,
}: {
  draft: AiOrganizationDraft;
  repoNames: ReadonlyMap<string, string>;
  targetNames: ReadonlyMap<string, string>;
  discarding: boolean;
  updatingReviewId: string | null;
  onUpdate: (input: {
    expectedRevision: number;
    change: AiOrganizationReviewChange;
  }) => Promise<AiOrganizationReviewUpdateResult>;
  onDiscard: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium text-body">{t('aiOrganization.resume.title')}</p>
          <p className="text-caption text-muted-foreground">
            {t('aiOrganization.resume.description', { count: draft.sourceRepoIds.length })}
          </p>
        </div>
      </div>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {t('aiOrganization.resume.action')}
      </Button>
      <AiOrganizationDraftDialog
        draft={draft}
        open={open}
        onOpenChange={setOpen}
        repoNames={repoNames}
        targetNames={targetNames}
        discarding={discarding}
        updatingReviewId={updatingReviewId}
        onUpdate={onUpdate}
        onDiscard={onDiscard}
      />
    </section>
  );
}
