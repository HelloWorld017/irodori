import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { iconNames } from 'lucide-react/dynamic';
import { useMemo, useRef, useState } from 'react';
import { DynamicIcon, IconPlus, IconSearch, IconX } from '@/fragments/_icons';
import { classes } from '@/utils/classes';

const ICON_COLUMNS = 8;
const ICON_ROW_HEIGHT = 46;
const ICON_NAME_SET = new Set<string>(iconNames);

type IconPickerProps = {
  value: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

export const IconPicker = ({ value, disabled = false, onChange }: IconPickerProps) => {
  const [search, setSearch] = useState('');
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredIconNames = useMemo(
    () =>
      iconNames.filter(iconName =>
        normalizedSearch ? iconName.toLowerCase().includes(normalizedSearch) : true
      ),
    [normalizedSearch]
  );

  const rowCount = Math.ceil(filteredIconNames.length / ICON_COLUMNS);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ICON_ROW_HEIGHT,
    overscan: 8,
  });

  const hasSelectedIcon = value !== null && ICON_NAME_SET.has(value);

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton
            type="button"
            disabled={disabled}
            className={classes(
              `flex h-11 w-11 items-center justify-center rounded-xl border border-line
              bg-elevated-background text-lg text-primary transition hover:bg-base-background
              focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2
              focus-visible:ring-offset-base-background focus-visible:outline-none
              disabled:cursor-not-allowed`,
              hasSelectedIcon && 'border-highlight text-highlight'
            )}
            aria-label={hasSelectedIcon ? `선택된 아이콘: ${value}` : '아이콘 선택'}
          >
            {hasSelectedIcon ? <DynamicIcon name={value} /> : <IconPlus />}
          </PopoverButton>

          <PopoverPanel
            anchor={{ to: 'bottom start', gap: 8 }}
            className="z-40 w-95 max-w-[calc(100vw-2rem)] rounded-2xl border border-line
              bg-base-background p-3 shadow-elevated"
          >
            <div className="flex items-center gap-2">
              <label
                className="flex flex-1 items-center gap-2 rounded-lg border border-line
                  bg-elevated-background px-2.5 py-2"
              >
                <IconSearch className="text-base text-secondary" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="아이콘 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none
                    placeholder:text-tertiary"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  close();
                }}
                disabled={value === null}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line
                  bg-base-background text-base text-secondary transition
                  hover:bg-elevated-background hover:text-primary disabled:cursor-not-allowed
                  disabled:opacity-50"
                aria-label="아이콘 선택 해제"
              >
                <IconX />
              </button>
            </div>

            <div
              ref={scrollElementRef}
              className="mt-3 h-70 overflow-y-auto rounded-xl border border-line
                bg-elevated-background p-2"
            >
              {filteredIconNames.length === 0 ? (
                <p className="py-8 text-center text-sm text-tertiary">일치하는 아이콘이 없어요.</p>
              ) : (
                <div
                  className="relative w-full"
                  style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                  {rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const baseIndex = virtualRow.index * ICON_COLUMNS;

                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute top-0 left-0 grid w-full grid-cols-8 gap-1.5"
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        {Array.from({ length: ICON_COLUMNS }, (_, offset) => {
                          const iconName = filteredIconNames[baseIndex + offset];
                          if (!iconName) {
                            return (
                              <div
                                key={`empty-${virtualRow.index}-${offset}`}
                                className="h-9 w-9"
                              />
                            );
                          }

                          const selected = value === iconName;

                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => {
                                onChange(iconName);
                                close();
                              }}
                              className={classes(
                                `flex h-9 w-9 items-center justify-center rounded-lg border
                                  text-base transition`,
                                selected
                                  ? 'border-highlight bg-highlight text-highlight-foreground'
                                  : `border-line bg-base-background text-primary
                                    hover:bg-elevated-background`
                              )}
                              aria-label={`${iconName} 아이콘 선택`}
                              title={iconName}
                            >
                              <DynamicIcon name={iconName} />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
};
