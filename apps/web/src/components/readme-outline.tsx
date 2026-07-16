import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@asterism/ui';
import { ListTreeIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReadmeOutlineItem } from '../lib/readme-outline';

interface ReadmeOutlineProps {
  items: ReadmeOutlineItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function visibleItems(items: ReadmeOutlineItem[], activeId: string | null) {
  const activeItem = items.find((item) => item.id === activeId);
  const activeParentId = activeItem?.parentId ?? activeItem?.id ?? items[0]?.id ?? null;
  return items.filter((item) => item.parentId === null || item.parentId === activeParentId);
}

function OutlineList({ items, activeId, onSelect }: ReadmeOutlineProps) {
  const { t } = useTranslation();
  const renderedItems = useMemo(() => visibleItems(items, activeId), [activeId, items]);

  return (
    <nav aria-label={t('readme.outlineLabel')}>
      <ul className="max-h-[min(26rem,60svh)] space-y-0.5 overflow-y-auto pr-1">
        {renderedItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              data-outline-id={item.id}
              aria-current={item.id === activeId ? 'location' : undefined}
              className={`flex min-h-8 w-full items-center rounded-md px-2 py-1 text-left text-caption transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                item.parentId ? 'pl-5 text-muted-foreground' : 'font-medium text-foreground'
              } ${item.id === activeId ? 'bg-accent text-foreground' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ReadmeOutlineTriggers(props: ReadmeOutlineProps) {
  const { t } = useTranslation();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectionMade = useRef(false);
  const selectFrom = (close: (open: boolean) => void) => (id: string) => {
    selectionMade.current = true;
    props.onSelect(id);
    close(false);
  };
  const preserveSelectedHeadingFocus = (event: Event) => {
    if (selectionMade.current) {
      event.preventDefault();
      selectionMade.current = false;
    }
  };

  return (
    <>
      <div className="hidden @min-[768px]/readme-workspace:block @min-[1100px]/readme-workspace:hidden">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 min-w-11 gap-2 sm:min-h-8 sm:min-w-0"
              data-readme-outline-trigger="popover"
            >
              <ListTreeIcon className="size-4" aria-hidden="true" />
              <span>{t('readme.outline')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 p-3"
            onCloseAutoFocus={preserveSelectedHeadingFocus}
          >
            <p className="mb-2 px-2 text-caption font-semibold">{t('readme.outline')}</p>
            <OutlineList {...props} onSelect={selectFrom(setPopoverOpen)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="@min-[768px]/readme-workspace:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="min-h-11 min-w-11"
              data-readme-outline-trigger="sheet"
            >
              <ListTreeIcon className="size-4" aria-hidden="true" />
              <span className="sr-only">{t('readme.outline')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            closeLabel={t('readme.closeOutline')}
            className="max-h-[80svh] rounded-t-xl pb-4"
            onCloseAutoFocus={preserveSelectedHeadingFocus}
          >
            <SheetHeader className="pb-2">
              <SheetTitle>{t('readme.outline')}</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 px-2">
              <OutlineList {...props} onSelect={selectFrom(setSheetOpen)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function ReadmeOutlineRail(props: ReadmeOutlineProps) {
  const { t } = useTranslation();

  return (
    <aside
      data-readme-outline="desktop"
      className="sticky top-6 hidden max-h-[calc(100svh-7rem)] self-start overflow-hidden rounded-lg border bg-card p-3 @min-[1100px]/readme-workspace:block"
    >
      <p className="mb-2 px-2 text-caption font-semibold">{t('readme.outline')}</p>
      <OutlineList {...props} />
    </aside>
  );
}
