import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { IconChevronLeft, IconSquarePlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { queryKey } from '@/utils/queryKey';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebook, useEntriesNotebookId } from '../_providers/EntriesProvider';
import type { EntriesSearchCriteria } from '../_types/EntriesSearchCriteria';

export const SidebarHeader = () => {
  const services = useServices();
  const showToast = useShowToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const notebook = useEntriesNotebook();
  const notebookId = useEntriesNotebookId();

  const { data: entriesCount } = useQuery({
    enabled: !!services,
    queryKey: queryKey('entries', 'count', notebookId),
    queryFn: () => services!.entries.countByNotebookId(notebookId),
  });

  const createEntryMutation = useMutation({
    mutationFn: async () => {
      if (!services) {
        throw new Error('Services are not initialized.');
      }

      return services.entries.create({
        notebookId,
        title: '새 일기',
      });
    },
    onSuccess: async entry => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['entries', 'list'] }),
        queryClient.invalidateQueries({ queryKey: queryKey('entries', 'count', notebookId) }),
      ]);

      navigate(
        buildRoute('entriesEdit', {
          notebookId,
          entryId: entry.id,
        }),
        { replace: true }
      );
    },
    onError: error => {
      console.error('Failed to create an entry', error);
      showToast({
        kind: 'error',
        message: '새 일기를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  if (!notebook) {
    return null;
  }

  return (
    <header className="flex flex-col px-8 sm:px-10">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="-ml-2 rounded-full p-2 text-2xl text-secondary transition
              hover:bg-elevated-background hover:text-primary"
            aria-label="뒤로가기"
          >
            <IconChevronLeft />
          </button>

          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">{notebook.title}</h2>
            <div className="text-secondary">
              {typeof entriesCount === 'number' ? `${entriesCount}개의 일기` : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => createEntryMutation.mutate()}
            disabled={createEntryMutation.isPending}
            className="rounded-lg p-2 text-secondary transition hover:bg-elevated-background
              hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="새 일기 추가"
          >
            <IconSquarePlus />
          </button>
        </div>
      </div>
    </header>
  );
};
