import { GENERATION_ADAPTER_IDS, isCustomGenerationAdapter } from '@asterism/core';
import type { AiAdapterId } from '@asterism/db';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@asterism/ui';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PendingActionContent } from './pending-action-content';

export interface AiConnectionFormValues {
  adapter: AiAdapterId;
  name: string;
  baseUrl: string;
  apiKey: string;
}

/**
 * 生成连接的新建 / 编辑对话框（受控、纯表单）。编辑态下适配器不可变，密钥留空表示
 * 保留现有凭据；父级负责把这里的取值映射为 create / update 载荷。
 */
export function AiConnectionFormDialog({
  open,
  onOpenChange,
  mode,
  title,
  submitLabel,
  initialAdapter = 'openai',
  initialName = '',
  initialBaseUrl = '',
  pending = false,
  errorMessage,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  title: string;
  submitLabel: string;
  initialAdapter?: AiAdapterId;
  initialName?: string;
  initialBaseUrl?: string;
  pending?: boolean;
  errorMessage?: string;
  onSubmit: (values: AiConnectionFormValues) => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [adapter, setAdapter] = useState<AiAdapterId>(initialAdapter);
  const [name, setName] = useState(initialName);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (open) {
      setAdapter(initialAdapter);
      setName(initialName);
      setBaseUrl(initialBaseUrl);
      setApiKey('');
    }
  }, [open, initialAdapter, initialName, initialBaseUrl]);

  const requiresBaseUrl = isCustomGenerationAdapter(adapter);
  const trimmedName = name.trim();
  const trimmedBaseUrl = baseUrl.trim();
  const trimmedKey = apiKey.trim();
  const isValid =
    trimmedName.length > 0 &&
    (!requiresBaseUrl || trimmedBaseUrl.length > 0) &&
    (mode === 'edit' || trimmedKey.length > 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      return;
    }
    onSubmit({
      adapter,
      name: trimmedName,
      baseUrl: requiresBaseUrl ? trimmedBaseUrl : '',
      apiKey: trimmedKey,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={pending}>
          <DialogHeader className="pr-10">
            <DialogTitle>{title}</DialogTitle>
            {errorMessage ? (
              <p role="alert" className="text-caption text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${fieldId}-adapter`}>{t('settings.ai.providerLabel')}</Label>
            <Select
              value={adapter}
              onValueChange={(value) => setAdapter(value as AiAdapterId)}
              disabled={mode === 'edit' || pending}
            >
              <SelectTrigger id={`${fieldId}-adapter`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENERATION_ADAPTER_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {t(`settings.ai.adapters.${id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${fieldId}-name`}>{t('settings.ai.nameLabel')}</Label>
            <Input
              id={`${fieldId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('settings.ai.namePlaceholder')}
              autoFocus
              maxLength={80}
              disabled={pending}
            />
          </div>

          {requiresBaseUrl ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${fieldId}-base-url`}>{t('settings.ai.baseUrlLabel')}</Label>
              <Input
                id={`${fieldId}-base-url`}
                type="url"
                inputMode="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder={t('settings.ai.baseUrlPlaceholder')}
                disabled={pending}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${fieldId}-key`}>{t('settings.ai.apiKeyLabel')}</Label>
            <Input
              id={`${fieldId}-key`}
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                mode === 'edit' ? t('settings.ai.apiKeyKeep') : t('settings.ai.apiKeyPlaceholder')
              }
              disabled={pending}
            />
            <p className="text-caption text-muted-foreground">{t('settings.ai.apiKeyHint')}</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={pending || !isValid} aria-busy={pending}>
              <PendingActionContent
                pending={pending}
                idleLabel={submitLabel}
                pendingLabel={t('common.saving')}
              />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
