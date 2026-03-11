import { useSuspenseQuery } from '@tanstack/react-query';
import { AnimateView } from '@/fragments/_components/AnimateView';
import { AsyncBoundary } from '@/fragments/_components/AsyncBoundary';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useRouteParams } from '@/hooks/useRouteParams';
import { toEntryDraftData } from '@/services/EntryDraftsService';
import { createTaggedError, isTaggedError } from '@/utils/error';
import { queryKey } from '@/utils/queryKey';
import { EntriesDetailEditView } from './_components/EntriesDetailEditView';
import { EntriesDetailReadView } from './_components/EntriesDetailReadView';
import { EntriesDetailEditProvider } from './_providers/EntriesDetailEditProvider';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';

type EntriesDetailFragmentProps = {
  edit?: boolean;
};

const EntriesDetailFragmentInner = ({ edit = false }: EntriesDetailFragmentProps) => {
  const services = useServices();
  const { entryId } = useRouteParams<'entriesDetail'>();

  const detailQuery = useSuspenseQuery({
    queryKey: queryKey('entriesDetail', 'detail', entryId),
    queryFn: () => services.entries.getDetailById(entryId),
  });

  const draftQuery = useSuspenseQuery({
    queryKey: queryKey('entriesDetail', 'draft', entryId),
    queryFn: () => services.entryDrafts.getByEntryId(entryId),
  });

  const tagCategoriesQuery = useSuspenseQuery({
    queryKey: queryKey('common', 'search-tag-categories', detailQuery.data?.notebookId ?? null),
    queryFn: () =>
      detailQuery.data && services.tagCategories.listByNotebookId(detailQuery.data.notebookId),
  });

  if (detailQuery.isError || tagCategoriesQuery.isError || (edit && draftQuery.isError)) {
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
    throw createTaggedError('entry-not-found', '선택한 일기를 찾지 못했어요.');
  }

  const tagCategories: TagCategory[] | null = tagCategoriesQuery.data ?? [];
  if (!edit) {
    return <EntriesDetailReadView entry={detailQuery.data} tagCategories={tagCategories} />;
  }

  const initialDraft = draftQuery.data?.data ?? toEntryDraftData(detailQuery.data);
  const initialSavedAt = draftQuery.data?.updatedAt ?? null;

  return (
    <EntriesDetailEditProvider
      entryId={detailQuery.data.id}
      initialDraft={initialDraft}
      initialSavedAt={initialSavedAt}
    >
      <EntriesDetailEditView entry={detailQuery.data} tagCategories={tagCategories} />
    </EntriesDetailEditProvider>
  );
};

export const EntriesDetailFragment = (props: EntriesDetailFragmentProps) => {
  const { entryId } = useRouteParams<'entriesDetail'>();
  return (
    <AnimateView key={`${entryId}_${props.edit ? 'edit' : 'read'}`}>
      <AsyncBoundary animateView>
        {{
          error: ({ error }) =>
            isTaggedError('entry-not-found', error)
              ? error.message
              : '일기를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
          loading: '일기를 불러오는 중이에요...',
          default: <EntriesDetailFragmentInner {...props} />,
        }}
      </AsyncBoundary>
    </AnimateView>
  );
};
