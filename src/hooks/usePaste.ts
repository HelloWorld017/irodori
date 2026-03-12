import { useCallback } from 'react';
import { useLatestCallback } from './useLatestCallback';
import type { RefCallback } from 'react';

type UsePasteProps = {
  onPaste: (files: File[]) => void;
};

const toFiles = (fileList: FileList | null) =>
  Array.from({ length: fileList?.length ?? 0 }, (_, index) => fileList?.item(index)).filter(
    (file): file is File => file !== null
  );

export const usePaste = ({ onPaste }: UsePasteProps) => {
  const onPasteLatest = useLatestCallback(onPaste);

  const ref = useCallback<RefCallback<HTMLElement>>(
    target => {
      if (!target) {
        return;
      }

      const handlePaste = (event: ClipboardEvent) => {
        const files = toFiles(event.clipboardData?.files ?? null);
        if (files.length === 0) {
          return;
        }

        event.preventDefault();
        onPasteLatest(files);
      };

      target.addEventListener('paste', handlePaste);

      return () => {
        target.removeEventListener('paste', handlePaste);
      };
    },
    [onPasteLatest]
  );

  return { ref };
};
