import { IconPencil } from '@/fragments/_icons';
import { useNavigate } from '@/fragments/_providers/RouterProvider';
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
}: {
  entry: EntryDetailItem;
  tagCategories: TagCategory[];
}) => {
  const notebookId = useEntriesNotebookId();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <EntryHeader
        index={entry.index}
        id={entry.id}
        title={entry.title}
        cover={entry.coverAsset}
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
          lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.6fr)] lg:gap-10"
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
