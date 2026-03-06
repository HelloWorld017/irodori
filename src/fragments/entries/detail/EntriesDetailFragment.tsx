import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useRouteParams } from '@/hooks/useRouteParams';
import { toEntryDraftData } from '@/services/EntryDraftsService';
import { queryKey } from '@/utils/queryKey';
import { EntriesDetailEditView } from './_components/EntriesDetailEditView';
import { EntriesDetailReadView } from './_components/EntriesDetailReadView';
import { EntriesDetailProvider } from './_providers/EntriesDetailProvider';

type EntriesDetailFragmentProps = {
  edit?: boolean;
};

export const EntriesDetailFragment = ({ edit = false }: EntriesDetailFragmentProps) => {
  const services = useServices();
  const { entryId } = useRouteParams<'entriesDetail'>();

  const detailQuery = useQuery({
    enabled: services !== null,
    queryKey: queryKey('entries', 'detail', entryId),
    queryFn: () => services!.entries.getDetailById(entryId),
  });

  const draftQuery = useQuery({
    enabled: edit && services !== null,
    queryKey: queryKey('entries', 'draft', entryId),
    queryFn: () => services!.entryDrafts.getByEntryId(entryId),
  });

  if (detailQuery.isPending || (edit && draftQuery.isPending)) {
    return (
      <section
        className="rounded-[1.75rem] border border-line bg-elevated-background p-8 shadow-elevated"
      >
        <p className="text-sm text-secondary">일기를 불러오는 중이에요...</p>
      </section>
    );
  }

  if (detailQuery.isError || (edit && draftQuery.isError)) {
    return (
      <section
        className="rounded-[1.75rem] border border-line bg-elevated-background p-8 shadow-elevated"
      >
        <p className="text-sm text-secondary">
          일기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  if (!detailQuery.data) {
    return (
      <section
        className="rounded-[1.75rem] border border-line bg-elevated-background p-8 shadow-elevated"
      >
        <p className="text-sm text-secondary">선택한 일기를 찾지 못했어요.</p>
      </section>
    );
  }

  if (!edit) {
    return <EntriesDetailReadView entry={detailQuery.data} />;
  }

  const initialDraft = draftQuery.data?.data ?? toEntryDraftData(detailQuery.data);
  const initialSavedAt = draftQuery.data?.updatedAt ?? null;

  return (
    <EntriesDetailProvider
      entryId={detailQuery.data.id}
      initialDraft={initialDraft}
      initialSavedAt={initialSavedAt}
    >
      <EntriesDetailEditView entry={detailQuery.data} />
    </EntriesDetailProvider>
  );
};
