import { IconChevronLeft, IconPencil } from '@/fragments/_icons';
import { useHistoryBack, useNavigate } from '@/fragments/_providers/RouterProvider';
import { useBreakPointIsBelow } from '@/hooks/useBreakPointIsBelow';
import { classes } from '@/utils/classes';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebookId } from '../../_providers/EntriesProvider';
import { EntryHeader } from './EntryHeader';
import { EntryMetadataRead } from './EntryMetadataRead';
import { InkMdeEditor } from './InkMdeEditor';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';
import type { EntryDetailItem } from '@/services/EntriesService';

export const EntriesDetailReadView = ({
  entry,
  tagCategories,
  className,
}: {
  entry: EntryDetailItem;
  tagCategories: TagCategory[];
  className?: string;
}) => {
  const notebookId = useEntriesNotebookId();
  const navigate = useNavigate();
  const historyBack = useHistoryBack();
  const isMobile = useBreakPointIsBelow('lg');

  return (
    <div className={classes('space-y-6', className)}>
      <EntryHeader
        index={entry.index}
        id={entry.id}
        title={entry.title}
        cover={entry.coverAsset}
        leadingAction={
          isMobile ? (
            <button
              type="button"
              onClick={historyBack}
              className="-ml-2 rounded-full p-2 text-2xl text-white/80 transition
                hover:bg-elevated-background-hover hover:text-white"
              aria-label="뒤로가기"
            >
              <IconChevronLeft />
            </button>
          ) : null
        }
        action={
          <button
            type="button"
            onClick={() =>
              navigate(buildRoute('entriesEdit', { notebookId, entryId: entry.id }), {
                replace: true,
              })
            }
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/20
              px-3 py-2 text-sm font-medium text-white/90 backdrop-blur-md transition
              hover:bg-black/35"
          >
            <IconPencil />
            수정
          </button>
        }
      />

      <div
        className="m-auto grid max-w-360 gap-8 p-6 sm:p-8
          xl:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.6fr)] xl:gap-10"
      >
        <section className="rounded-[1.75rem]">
          <div className="space-y-4">
            <p className="text-sm font-medium text-secondary">본문</p>
            {entry.body.trim() ? (
              <article className="text-[15px] leading-7 whitespace-pre-wrap text-primary">
                <InkMdeEditor value={entry.body} />
              </article>
            ) : (
              <p className="text-sm text-tertiary">아직 작성된 본문이 없어요.</p>
            )}
          </div>
        </section>

        <EntryMetadataRead
          className="space-y-5 rounded-[1.75rem]"
          entry={entry}
          tagCategories={tagCategories}
        />
      </div>
    </div>
  );
};
