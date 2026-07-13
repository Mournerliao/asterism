import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '../theme-provider';

function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--glass-surface-strong)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--glass-border)',
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
