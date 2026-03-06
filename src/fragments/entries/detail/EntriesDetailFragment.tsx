import { MeshGradient } from '@mesh-gradient/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { StickerPicker, type StickerPickerValue } from '@/fragments/_components/StickerPicker';
import { Tag } from '@/fragments/_components/Tag';
import { IconPencil } from '@/fragments/_icons';
import { useClxDB, useRepositories, useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { useRouteParams } from '@/hooks/useRouteParams';
import { toEntryDraftData } from '@/services/EntryDraftsService';
import { uploadAssetImage } from '@/utils/assets';
import { formatDate } from '@/utils/date';
import { queryKey } from '@/utils/queryKey';
import { murmurhash2 } from '@/utils/random';
import { buildRoute } from '@/utils/route';
import { TagsPicker } from '../_components/TagsPicker';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';
import { InkMdeEditor } from './_components/InkMdeEditor';
import { GRADIENT_COLORS } from './_constants/gradient';
import {
  EntriesDetailProvider,
  useEntriesDetailDraft,
  useEntriesDetailIsDirty,
  useEntriesDetailSaveState,
  useSetEntriesDetailBody,
  useSetEntriesDetailCover,
  useSetEntriesDetailDate,
  useSetEntriesDetailStickerValue,
  useSetEntriesDetailTags,
  useSetEntriesDetailTitle,
} from './_providers/EntriesDetailProvider';
import type { EntryDraftSticker } from '@/repositories/EntryDraftsRepository';
import type { EntryDetailItem } from '@/services/EntriesService';

const toDateInputValue = (value: number): string => {
  const date = new Date(value);
  const pad2 = (part: number) => part.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const toDateFromInputValue = (value: string, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const nextValue = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const toStickerPickerValue = (sticker: EntryDraftSticker | null): StickerPickerValue => {
  if (!sticker) {
    return null;
  }

  if (sticker.kind === 'emoji') {
    return { kind: 'emoji', emoji: sticker.emoji };
  }

  return { kind: 'sticker', stickerId: sticker.sticker.id };
};

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

  return '편집 내용을 저장해 보세요';
};

const EntryHeader = ({
  index,
  id,
  title,
  cover,
  coverAction,
  action,
}: {
  index: number;
  id: string;
  title: string;
  cover: {
    blobDigest: string;
    blurhash: string | null;
    mime: string;
    width: number | null;
    height: number | null;
  } | null;
  coverAction?: React.ReactNode;
  action?: React.ReactNode;
}) => {
  const gradientColors = useMemo(
    () => GRADIENT_COLORS[murmurhash2(id) % GRADIENT_COLORS.length],
    [id]
  );

  return (
    <section className="relative overflow-hidden rounded-[2rem]">
      <div className="relative min-h-72 sm:min-h-88">
        {cover ? (
          <AssetImage
            blobDigest={cover.blobDigest}
            blurhash={cover.blurhash}
            alt={title || `#${index} cover`}
            className="absolute inset-0 h-full w-full"
            imageClassName="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <MeshGradient
            className="absolute inset-0 h-full w-full"
            options={{
              colors: [...gradientColors] as [string, string, string, string],
              seed: murmurhash2(id),
              animationSpeed: 0.25,
            }}
          />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        <div className="relative z-1 flex min-h-72 flex-col justify-between p-6 sm:min-h-88 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <span
              className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-sm
                font-medium text-white/90 backdrop-blur-md"
            >
              #{index}
            </span>
            <div className="flex items-center gap-2">
              {coverAction}
              {action}
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title || '제목 없는 일기'}
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
};

const EntryMetadataSection = ({ entry, edit }: { entry: EntryDetailItem; edit: boolean }) => {
  const notebookId = useEntriesNotebookId();
  const draft = useEntriesDetailDraft();
  const setDate = useSetEntriesDetailDate();
  const setTags = useSetEntriesDetailTags();
  const setStickerValue = useSetEntriesDetailStickerValue();
  const [tagsDraftInput, setTagsDraftInput] = useState('');

  if (!edit) {
    return (
      <aside className="space-y-5 rounded-[1.75rem] p-6">
        <section className="space-y-2">
          <p className="text-sm font-medium text-secondary">날짜</p>
          <time dateTime={new Date(entry.date).toISOString()} className="text-base text-primary">
            {formatDate(entry.date)}
          </time>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-medium text-secondary">태그</p>
          <div className="flex flex-wrap gap-2">
            {entry.tags.length > 0 ? (
              entry.tags.map(tag => <Tag key={tag.id} {...tag} />)
            ) : (
              <p className="text-sm text-tertiary">아직 태그가 없어요.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-medium text-secondary">스티커</p>
          <div className="flex flex-wrap gap-3">
            {entry.stickers.length > 0 ? (
              entry.stickers.map(({ slot, sticker }) => (
                <div
                  key={slot}
                  className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl
                    border border-line bg-base-background"
                  title={sticker.label}
                >
                  {sticker.kind === 'emoji' && sticker.emoji ? (
                    <span className="text-3xl leading-none">{sticker.emoji}</span>
                  ) : (
                    <AssetImage
                      blobDigest={sticker.blobDigest}
                      alt={sticker.label}
                      className="h-full w-full"
                      imageClassName="h-full w-full object-contain p-2"
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-tertiary">아직 붙인 스티커가 없어요.</p>
            )}
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="space-y-5 rounded-[1.75rem] p-6">
      <section className="space-y-2">
        <p className="text-sm font-medium text-secondary">날짜</p>
        <input
          type="date"
          value={toDateInputValue(draft.date)}
          onChange={event => setDate(toDateFromInputValue(event.target.value, draft.date))}
          className="w-full rounded-xl border border-line bg-base-background px-3 py-2 text-sm
            text-primary outline-none focus-visible:ring-2 focus-visible:ring-highlight"
        />
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">태그</p>
        <TagsPicker
          notebookId={notebookId}
          value={{ draft: tagsDraftInput, tags: draft.tags }}
          allowCreateTag={false}
          placeholder="태그를 추가하세요"
          onChange={({ draft: nextDraftInput, tags }) => {
            setTagsDraftInput(nextDraftInput);
            setTags(tags);
          }}
          onSubmit={({ draft: nextDraftInput, tags }) => {
            setTagsDraftInput(nextDraftInput);
            setTags(tags);
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">스티커</p>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, index) => {
            const slot = index + 1;
            const value = toStickerPickerValue(
              draft.stickers.find(sticker => sticker.slot === slot) ?? null
            );

            return (
              <div key={slot} className="space-y-2 text-center">
                <StickerPicker
                  value={value}
                  className="w-full"
                  onChange={nextValue => void setStickerValue(slot, nextValue)}
                />
                <p className="text-xs text-tertiary">슬롯 {slot}</p>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
};

const EntriesDetailEditorView = ({ entry }: { entry: EntryDetailItem }) => {
  const services = useServices();
  const repositories = useRepositories();
  const clxDB = useClxDB();
  const showToast = useShowToast();
  const queryClient = useQueryClient();
  const notebookId = useEntriesNotebookId();
  const { entryId } = useRouteParams<'entriesDetail'>();
  const [, navigate] = useLocation();
  const draft = useEntriesDetailDraft();
  const isDirty = useEntriesDetailIsDirty();
  const { saveState, lastSavedAt } = useEntriesDetailSaveState();
  const setTitle = useSetEntriesDetailTitle();
  const setBody = useSetEntriesDetailBody();
  const setCover = useSetEntriesDetailCover();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!services) {
        throw new Error('Services are not initialized.');
      }

      return services.entryDrafts.publish({ entryId, data: draft });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKey('entries', 'detail', entryId) }),
        queryClient.invalidateQueries({ queryKey: queryKey('entries', 'list') }),
      ]);
      queryClient.removeQueries({ queryKey: queryKey('entries', 'draft', entryId) });
      showToast({ kind: 'success', message: '일기를 저장했어요.' });
      navigate(buildRoute('entriesDetail', { notebookId, entryId }), { replace: true });
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
  const cover = draft.cover;

  const handleCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !clxDB || !repositories || !services) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-secondary">{statusLabel}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(buildRoute('entriesDetail', { notebookId, entryId }), { replace: true })
            }
            className="rounded-xl border border-line bg-base-background px-4 py-2 text-sm
              font-medium text-secondary transition hover:bg-elevated-background hover:text-primary"
          >
            돌아가기
          </button>
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
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

      <section className="relative overflow-hidden rounded-[2rem]">
        <div className="relative min-h-72 sm:min-h-88">
          {cover ? (
            <AssetImage
              blobDigest={cover.blobDigest}
              blurhash={cover.blurhash}
              alt={draft.title || `#${entry.index} cover`}
              className="absolute inset-0 h-full w-full"
              imageClassName="h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <MeshGradient
              className="absolute inset-0 h-full w-full"
              options={{
                colors: [...GRADIENT_COLORS[murmurhash2(entry.id) % GRADIENT_COLORS.length]] as [
                  string,
                  string,
                  string,
                  string,
                ],
                seed: murmurhash2(entry.id),
                animationSpeed: 0.25,
              }}
            />
          )}

          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          <div
            className="relative z-1 flex min-h-72 flex-col justify-between p-6 sm:min-h-88 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <span
                className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-sm
                  font-medium text-white/90 backdrop-blur-md"
              >
                #{entry.index}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="rounded-full border border-white/25 bg-black/20 px-3 py-2 text-sm
                  font-medium text-white/90 backdrop-blur-md transition hover:bg-black/35
                  disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingCover ? '업로드 중...' : '커버 수정'}
              </button>
            </div>

            <div className="max-w-3xl space-y-3">
              <input
                value={draft.title}
                onChange={event => setTitle(event.target.value)}
                placeholder="일기 제목"
                className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-3xl
                  font-semibold tracking-tight text-white backdrop-blur-md outline-none
                  placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white/60
                  sm:text-4xl"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.95fr)]">
        <section className="space-y-4 rounded-[1.75rem] p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-secondary">본문</p>
            <p className="text-sm text-tertiary">
              편집 내용은 자동으로 임시저장되고, 저장하기를 눌러야 반영돼요.
            </p>
          </div>

          <InkMdeEditor
            value={draft.body}
            placeholder="오늘 하루를 적어보세요"
            onChange={setBody}
          />
        </section>

        <EntryMetadataSection entry={entry} edit />
      </div>
    </div>
  );
};

const EntriesDetailReadView = ({ entry }: { entry: EntryDetailItem }) => {
  const notebookId = useEntriesNotebookId();
  const { entryId } = useRouteParams<'entriesDetail'>();
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
              navigate(buildRoute('entriesEdit', { notebookId, entryId }), { replace: true })
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

        <EntryMetadataSection entry={entry} edit={false} />
      </div>
    </div>
  );
};

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
    return (
      <EntriesDetailProvider
        entryId={entryId}
        initialDraft={toEntryDraftData(detailQuery.data)}
        initialSavedAt={null}
      >
        <EntriesDetailReadView entry={detailQuery.data} />
      </EntriesDetailProvider>
    );
  }

  const initialDraft = draftQuery.data?.data ?? toEntryDraftData(detailQuery.data);
  const initialSavedAt = draftQuery.data?.updatedAt ?? null;

  return (
    <EntriesDetailProvider
      entryId={entryId}
      initialDraft={initialDraft}
      initialSavedAt={initialSavedAt}
    >
      <EntriesDetailEditorView entry={detailQuery.data} />
    </EntriesDetailProvider>
  );
};
