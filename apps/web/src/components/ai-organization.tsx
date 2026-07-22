import type { AiConnection, AiOrganizationDraft } from '@asterism/db';
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
  LoaderCircleIcon,
  MinusIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
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

function SuggestionSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof PlusIcon;
  items: React.ReactNode[];
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 font-medium text-caption">
        <Icon className="size-4" />
        {title}
        <Badge variant="secondary">{items.length}</Badge>
      </h3>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">{items}</ul>
      ) : (
        <p className="mt-2 text-caption text-muted-foreground">—</p>
      )}
    </section>
  );
}

export function AiOrganizationDraftDialog({
  draft,
  open,
  onOpenChange,
  repoNames,
  targetNames,
  discarding,
  onDiscard,
}: {
  draft: AiOrganizationDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoNames: ReadonlyMap<string, string>;
  targetNames: ReadonlyMap<string, string>;
  discarding: boolean;
  onDiscard: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [discardFailed, setDiscardFailed] = useState(false);
  const additions = draft.suggestions.relationChanges.filter((item) => item.action === 'add');
  const removals = draft.suggestions.relationChanges.filter((item) => item.action === 'remove');
  const row = (item: (typeof additions)[number]) => (
    <li
      key={`${item.repoId}:${item.relationType}:${item.targetId}:${item.action}`}
      className="rounded-md border bg-card px-3 py-2 text-caption"
    >
      <span className="font-medium">{repoNames.get(item.repoId) ?? item.repoId}</span>
      <span className="mx-2 text-muted-foreground">→</span>
      <span>{targetNames.get(item.targetId) ?? item.targetId}</span>
      <Badge variant="outline" className="ml-2">
        {t(`aiOrganization.kind.${item.relationType}`)}
      </Badge>
    </li>
  );
  const newItems = draft.suggestions.newClassifications.map((item) => (
    <li
      key={`${item.relationType}:${item.name}`}
      className="rounded-md border bg-card px-3 py-2 text-caption"
    >
      <span className="font-medium">{item.name}</span>
      <Badge variant="outline" className="ml-2">
        {t(`aiOrganization.kind.${item.relationType}`)}
      </Badge>
      <span className="ml-2 text-muted-foreground">
        {t('aiOrganization.draft.repoCount', { count: item.repoIds.length })}
      </span>
    </li>
  ));
  const empty = additions.length + removals.length + newItems.length === 0;

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
    <Dialog open={open} onOpenChange={(next) => !discarding && onOpenChange(next)}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] sm:max-w-[40rem]"
        closeDisabled={discarding}
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
        <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
          {empty ? (
            <div className="rounded-lg border bg-card p-4">
              <p className="font-medium text-body">{t('aiOrganization.draft.noChangesTitle')}</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {t('aiOrganization.draft.noChangesDescription')}
              </p>
            </div>
          ) : (
            <>
              <SuggestionSection
                title={t('aiOrganization.draft.additions')}
                icon={PlusIcon}
                items={additions.map(row)}
              />
              <SuggestionSection
                title={t('aiOrganization.draft.removals')}
                icon={MinusIcon}
                items={removals.map(row)}
              />
              <SuggestionSection
                title={t('aiOrganization.draft.newClassifications')}
                icon={SparklesIcon}
                items={newItems}
              />
            </>
          )}
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
            disabled={discarding}
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={discarding}
            onClick={() => onOpenChange(false)}
          >
            {t('common.close')}
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
  onDiscard,
}: {
  draft: AiOrganizationDraft;
  repoNames: ReadonlyMap<string, string>;
  targetNames: ReadonlyMap<string, string>;
  discarding: boolean;
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
        onDiscard={onDiscard}
      />
    </section>
  );
}
