import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ModeToggleLabels {
  light: string;
  dark: string;
  system: string;
  toggle: string;
}

const DEFAULT_LABELS: ModeToggleLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  toggle: 'Toggle theme',
};

function ModeToggle({ labels = DEFAULT_LABELS }: { labels?: ModeToggleLabels }) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={labels.toggle}>
          <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{labels.toggle}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>{labels.light}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>{labels.dark}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>{labels.system}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { ModeToggleLabels };
export { ModeToggle };
