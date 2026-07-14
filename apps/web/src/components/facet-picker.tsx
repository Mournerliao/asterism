import { Button, cn, Input, Popover, PopoverContent, PopoverTrigger } from '@asterism/ui';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useDeferredValue, useId, useMemo, useRef, useState } from 'react';
import { getVisibleFacetOptions } from './facet-options';
import { SearchInputIcon } from './search-input-icon';

interface FacetPickerProps {
  value: string | null;
  options: readonly string[];
  triggerLabel: string;
  allLabel: string;
  searchLabel: string;
  emptyLabel: string;
  resultsHint: (count: number) => string;
  className?: string;
  onValueChange: (value: string | null) => void;
}

export function FacetPicker({
  value,
  options,
  triggerLabel,
  allLabel,
  searchLabel,
  emptyLabel,
  resultsHint,
  className,
  onValueChange,
}: FacetPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const visible = useMemo(
    () => getVisibleFacetOptions(options, deferredQuery, value),
    [deferredQuery, options, value],
  );

  const choose = (nextValue: string | null) => {
    onValueChange(nextValue);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'min-w-28 max-w-44 justify-between rounded-lg border-[var(--glass-border)] px-2.5 font-normal text-caption shadow-none hover:bg-accent/70',
            value !== null && 'border-primary/30 bg-primary/5 hover:bg-primary/10',
            className,
          )}
        >
          <span className="truncate">{value ?? triggerLabel}</span>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="border-b p-2">
          <div className="relative">
            <SearchInputIcon className="left-2.5" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchLabel}
              aria-label={searchLabel}
              aria-controls={listId}
              className="pl-8"
            />
          </div>
        </div>
        <div id={listId} className="max-h-64 overflow-y-auto p-1">
          {!deferredQuery.trim() ? (
            <button
              type="button"
              aria-pressed={value === null}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => choose(null)}
            >
              <span className="truncate">{allLabel}</span>
              {value === null ? <CheckIcon className="ml-auto size-4" /> : null}
            </button>
          ) : null}
          {visible.items.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => choose(option)}
            >
              <span className="truncate">{option}</span>
              {value === option ? <CheckIcon className="ml-auto size-4" /> : null}
            </button>
          ))}
          {visible.total === 0 ? (
            <p className="px-2 py-6 text-center text-muted-foreground text-sm">{emptyLabel}</p>
          ) : null}
        </div>
        {visible.truncated ? (
          <p className="border-t px-3 py-2 text-muted-foreground text-xs">
            {resultsHint(visible.items.length)}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
