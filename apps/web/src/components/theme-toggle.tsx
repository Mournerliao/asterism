import { ModeToggle } from '@asterism/ui';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { t } = useTranslation();

  return (
    <ModeToggle
      labels={{
        light: t('theme.light'),
        dark: t('theme.dark'),
        system: t('theme.system'),
        toggle: t('theme.toggle'),
      }}
    />
  );
}
