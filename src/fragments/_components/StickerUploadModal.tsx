import { DialogTitle } from '@headlessui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { AnimatedModal } from '@/fragments/_components/AnimatedModal';
import { Dropzone } from '@/fragments/_components/Dropzone';
import { useClxDB, useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { uploadAssetImage } from '@/utils/assets';
import { queryKey } from '@/utils/queryKey';
import type { Sticker } from '@/repositories/StickersRepository';

const resolveDefaultLabel = (file: File) => {
  const normalizedName = file.name.trim();
  const extensionIndex = normalizedName.lastIndexOf('.');
  const fallbackLabel =
    extensionIndex > 0 ? normalizedName.slice(0, extensionIndex) : normalizedName;

  return fallbackLabel.trim() || '새 스티커';
};

const resolveUploadFile = (files: File[]) =>
  files.find(file => file.type.startsWith('image/')) ?? null;

type StickerUploadModalProps = {
  open: boolean;
  onClose: () => void;
  onUploaded: (sticker: Sticker) => void;
};

export const StickerUploadModal = ({ open, onClose, onUploaded }: StickerUploadModalProps) => {
  const clxDB = useClxDB();
  const services = useServices();
  const showToast = useShowToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');

  const previewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setLabel('');
    }
  }, [open]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const uploadMutation = useMutation({
    mutationFn: async ({ file, nextLabel }: { file: File; nextLabel: string }) => {
      const asset = await uploadAssetImage({ clxDB, services, file });

      return services.stickers.create({
        kind: 'custom',
        label: nextLabel,
        assetId: asset.id,
      });
    },
    onSuccess: async sticker => {
      await queryClient.invalidateQueries({ queryKey: queryKey('common', 'sticker-picker-list') });
      showToast({ kind: 'success', message: '스티커를 업로드했어요.' });
      onClose();
      onUploaded(sticker);
    },
    onError: error => {
      console.error('Failed to upload sticker', error);
      showToast({
        kind: 'error',
        message: '스티커를 업로드하지 못했어요. 다시 시도해 주세요.',
      });
    },
  });

  const handleClose = () => {
    if (uploadMutation.isPending) {
      return;
    }

    onClose();
  };

  const handleDrop = (files: File[]) => {
    const file = resolveUploadFile(files);
    if (!file) {
      showToast({
        kind: 'error',
        message: '이미지 파일만 스티커로 업로드할 수 있어요.',
      });
      return;
    }

    setSelectedFile(file);
    setLabel(resolveDefaultLabel(file));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedLabel = label.trim();
    if (!selectedFile || !normalizedLabel || uploadMutation.isPending) {
      return;
    }

    uploadMutation.mutate({ file: selectedFile, nextLabel: normalizedLabel });
  };

  return (
    <AnimatedModal
      open={open}
      onClose={handleClose}
      dismissable={!uploadMutation.isPending}
      className="relative w-full max-w-xl rounded-[2rem] bg-base-background shadow-elevated ring-1
        ring-line"
    >
      <section className="flex flex-col gap-5 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <DialogTitle as="h2" className="text-lg font-semibold text-primary">
              스티커 업로드
            </DialogTitle>
            <p className="text-sm text-secondary">이미지를 업로드해서 커스텀 스티커로 추가해요.</p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="rounded-lg px-3 py-2 text-sm font-medium text-secondary transition
              hover:bg-elevated-background hover:text-primary disabled:cursor-not-allowed
              disabled:opacity-50"
          >
            닫기
          </button>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Dropzone
            static
            accept="image/*"
            onDrop={handleDrop}
            title={
              selectedFile
                ? '이미지를 바꾸려면 다시 놓거나 선택하세요'
                : '스티커 이미지를 넣어 주세요'
            }
            description={
              selectedFile
                ? `${selectedFile.name} 파일이 준비되었어요.`
                : 'PNG, JPG, GIF 같은 이미지 파일을 바로 업로드할 수 있어요.'
            }
          />

          {previewUrl ? (
            <div className="rounded-[1.5rem] border border-line bg-elevated-background p-3">
              <div
                className="flex h-44 items-center justify-center overflow-hidden rounded-[1.1rem]
                  bg-base-background"
              >
                <img
                  src={previewUrl}
                  alt={label || selectedFile?.name || '스티커 미리보기'}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-primary">스티커 이름</span>
            <input
              value={label}
              onChange={event => setLabel(event.target.value)}
              disabled={uploadMutation.isPending}
              placeholder="검색할 때 찾기 쉬운 이름을 적어 주세요"
              className="w-full rounded-xl border border-line bg-elevated-background px-4 py-3
                text-sm text-primary transition outline-none placeholder:text-tertiary
                focus:border-highlight disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
              className="rounded-xl border border-line bg-base-background px-4 py-2.5 text-sm
                font-medium text-secondary transition hover:bg-elevated-background
                hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!selectedFile || label.trim() === '' || uploadMutation.isPending}
              className="rounded-xl bg-highlight px-4 py-2.5 text-sm font-medium
                text-highlight-foreground transition hover:bg-highlight-hover
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadMutation.isPending ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </form>
      </section>
    </AnimatedModal>
  );
};
