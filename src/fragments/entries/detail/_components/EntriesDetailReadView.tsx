import { useLocation } from 'wouter';
import { IconPencil } from '@/fragments/_icons';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebookId } from '../../_providers/EntriesProvider';
import { EntryHeader } from './EntryHeader';
import { EntryMetadataRead } from './EntryMetadataRead';
import type { EntryDetailItem } from '@/services/EntriesService';

export const EntriesDetailReadView = ({ entry }: { entry: EntryDetailItem }) => {
  const notebookId = useEntriesNotebookId();
  const [, navigate] = useLocation();

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
            className="inline-flex items-center gap-2 rounded-full border border-white/25
              bg-black/20 px-3 py-2 text-sm font-medium text-white/90 backdrop-blur-md transition
              hover:bg-black/35"
          >
            <IconPencil />
            수정
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.95fr)]">
        <section className="rounded-[1.75rem] p-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-secondary">본문</p>
            {entry.body.trim() ? (
              <article className="text-[15px] leading-7 whitespace-pre-wrap text-primary">
                {entry.body}
              </article>
            ) : (
              <p className="text-sm text-tertiary">아직 작성된 본문이 없어요.</p>
            )}
          </div>
        </section>

        <EntryMetadataRead entry={entry} />
      </div>
    </div>
  );
};
