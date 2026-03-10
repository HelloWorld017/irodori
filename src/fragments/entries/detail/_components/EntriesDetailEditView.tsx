import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { IconChevronDown } from '@/fragments/_icons';
import { useConfirm } from '@/fragments/_providers/AlertProvider';
import { useClxDB, useRepositories, useServices } from '@/fragments/_providers/DatabaseProvider';
import { useNavigate } from '@/fragments/_providers/RouterProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { uploadAssetImage } from '@/utils/assets';
import { formatDate } from '@/utils/date';
import { anyParams, queryKey } from '@/utils/queryKey';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebookId } from '../../_providers/EntriesProvider';
import {
  useEntriesDetailDraft,
  useEntriesDetailIsDirty,
  useEntriesDetailSaveState,
  useSetEntriesDetailBody,
  useSetEntriesDetailCover,
  useSetEntriesDetailTitle,
} from '../_providers/EntriesDetailProvider';
import { EntryHeader } from './EntryHeader';
import { EntryMetadataEdit } from './EntryMetadataEdit';
import { InkMdeEditor } from './InkMdeEditor';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';
import type { EntryDetailItem } from '@/services/EntriesService';

const getDraftStatusLabel = (
  saveState: 'idle' | 'saving' | 'saved' | 'error',
  isDirty: boolean,
  lastSavedAt: number | null,
  isPublishing: boolean
): string => {
  if (isPublishing) {
    return '저장 중이에요...';
  }

  if (saveState === 'saving') {
    return '임시저장 중이에요...';
  }

  if (saveState === 'error') {
    return '임시저장에 실패했어요';
  }

  if (isDirty) {
    return '저장되지 않은 변경사항이 있어요';
  }

  if (lastSavedAt) {
    return `${formatDate(lastSavedAt)} 임시저장됨`;
  }

  return '';
};

export const EntriesDetailEditView = ({
  entry,
  tagCategories,
}: {
  entry: EntryDetailItem;
  tagCategories: TagCategory[];
}) => {
  const services = useServices();
  const repositories = useRepositories();
  const clxDB = useClxDB();
  const showToast = useShowToast();
  const queryClient = useQueryClient();
  const notebookId = useEntriesNotebookId();
  const navigate = useNavigate();
  const draft = useEntriesDetailDraft();
  const isDirty = useEntriesDetailIsDirty();
  const { saveState, lastSavedAt } = useEntriesDetailSaveState();
  const setTitle = useSetEntriesDetailTitle();
  const setBody = useSetEntriesDetailBody();
  const setCover = useSetEntriesDetailCover();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const publishMutation = useMutation({
    mutationFn: async () => services.entryDrafts.publish({ entryId: entry.id, data: draft }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKey('entriesDetail', 'detail', entry.id) }),
        queryClient.invalidateQueries({ queryKey: queryKey('entries', 'list', anyParams) }),
      ]);
      queryClient.removeQueries({ queryKey: queryKey('entriesDetail', 'draft', entry.id) });
      showToast({ kind: 'success', message: '일기를 저장했어요.' });
      navigate(buildRoute('entriesDetail', { notebookId, entryId: entry.id }), { replace: true });
    },
    onError: error => {
      console.error('Failed to publish entry draft', error);
      showToast({
        kind: 'error',
        message: '일기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const statusLabel = getDraftStatusLabel(
    saveState,
    isDirty,
    lastSavedAt,
    publishMutation.isPending
  );

  const clearDraftAndBackMutation = useMutation({
    mutationFn: async () => services.entryDrafts.clear({ entryId: entry.id }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKey('entriesDetail', 'draft', entry.id) });
      showToast({ kind: 'success', message: '임시저장을 지우고 돌아갔어요.' });
      navigate(buildRoute('entriesDetail', { notebookId, entryId: entry.id }), { replace: true });
    },
    onError: error => {
      console.error('Failed to clear entry draft', error);
      showToast({
        kind: 'error',
        message: '임시저장을 지우지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const removeEntryMutation = useMutation({
    mutationFn: async () => {
      await services.entryDrafts.clear({ entryId: entry.id });
      await services.entries.remove({ id: entry.id });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKey('entries', 'list', anyParams) }),
        queryClient.invalidateQueries({ queryKey: queryKey('entries', 'count', notebookId) }),
      ]);
      queryClient.removeQueries({ queryKey: queryKey('entriesDetail', 'detail', entry.id) });
      queryClient.removeQueries({ queryKey: queryKey('entriesDetail', 'draft', entry.id) });
      showToast({ kind: 'success', message: '일기를 삭제했어요.' });
      navigate(buildRoute('entries', { notebookId }), { replace: true });
    },
    onError: error => {
      console.error('Failed to remove entry', error);
      showToast({
        kind: 'error',
        message: '일기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const isActionPending =
    publishMutation.isPending ||
    clearDraftAndBackMutation.isPending ||
    removeEntryMutation.isPending;

  const handleCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploadingCover(true);

    try {
      const asset = await uploadAssetImage({ clxDB, repositories, services, file });
      setCover({
        id: asset.id,
        blobDigest: asset.blobDigest,
        blurhash: asset.blurhash,
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
      });
      showToast({ kind: 'success', message: '커버 이미지를 준비했어요.' });
    } catch (error) {
      console.error('Failed to upload cover image', error);
      showToast({
        kind: 'error',
        message: '커버 이미지를 업로드하지 못했어요. 다시 시도해 주세요.',
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleClearDraftAndBack = () => {
    if (isActionPending) {
      return;
    }

    clearDraftAndBackMutation.mutate();
  };

  const handleDeleteEntry = async () => {
    if (isActionPending) {
      return;
    }

    const accepted = await confirm({
      title: '일기를 삭제할까요?',
      message: `"${draft.title}" 일기는 삭제되며, 되돌릴 수 없어요.`,
      kind: 'warning',
      confirmLabel: '삭제하기',
      cancelLabel: '취소',
    });

    if (!accepted) {
      return;
    }

    removeEntryMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-secondary">{statusLabel}</p>
        <div className="flex gap-3">
          <div className="flex">
            <button
              type="button"
              onClick={() =>
                navigate(buildRoute('entriesDetail', { notebookId, entryId: entry.id }), {
                  replace: true,
                })
              }
              disabled={isActionPending}
              className="rounded-xl rounded-r-none border border-line bg-base-background px-4 py-2
                text-sm font-medium text-secondary transition hover:bg-elevated-background
                hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              돌아가기
            </button>

            <Popover className="relative flex">
              {({ close }) => (
                <>
                  <PopoverButton
                    type="button"
                    disabled={isActionPending}
                    className="flex items-center justify-center rounded-xl rounded-l-none border
                      border-l-0 border-line bg-base-background px-3 py-2 text-secondary transition
                      hover:bg-elevated-background hover:text-primary disabled:cursor-not-allowed
                      disabled:opacity-60"
                    aria-label="더 보기"
                  >
                    <IconChevronDown />
                  </PopoverButton>

                  <PopoverPanel
                    anchor={{ to: 'bottom end', gap: 8 }}
                    className="z-30 w-56 rounded-xl border border-line bg-base-background p-1
                      shadow-elevated"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        handleClearDraftAndBack();
                      }}
                      disabled={isActionPending}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-secondary
                        transition hover:bg-elevated-background hover:text-primary
                        disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      임시저장을 지우고 돌아가기
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        void handleDeleteEntry();
                      }}
                      disabled={isActionPending}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger
                        transition hover:bg-danger-foreground/20 disabled:cursor-not-allowed
                        disabled:opacity-60"
                    >
                      일기 삭제
                    </button>
                  </PopoverPanel>
                </>
              )}
            </Popover>
          </div>

          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={isActionPending}
            className="rounded-xl bg-highlight px-4 py-2 text-sm font-medium
              text-highlight-foreground transition hover:bg-highlight-hover
              disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishMutation.isPending ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={event => void handleCoverFileChange(event)}
      />

      <EntryHeader
        index={entry.index}
        id={entry.id}
        title={draft.title}
        cover={draft.cover}
        action={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingCover}
            className="rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-sm font-medium
              text-white/90 backdrop-blur-md transition hover:bg-black/35
              disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploadingCover ? '업로드 중...' : '커버 수정'}
          </button>
        }
        titleContent={
          <input
            value={draft.title}
            onChange={event => setTitle(event.target.value)}
            placeholder="일기 제목"
            className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-3xl
              font-semibold tracking-tight text-white backdrop-blur-md outline-none
              placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white/60
              sm:text-4xl"
          />
        }
      />
      <div
        className="m-auto grid max-w-360 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.6fr)]
          lg:gap-6"
      >
        <section className="space-y-4 rounded-[1.75rem] p-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-secondary">본문</p>
          </div>

          <InkMdeEditor
            value={draft.body}
            placeholder="오늘 하루를 적어보세요"
            onChange={setBody}
          />
        </section>

        <EntryMetadataEdit
          className="space-y-5 rounded-[1.75rem] p-2"
          tagCategories={tagCategories}
        />
      </div>
    </div>
  );
};
