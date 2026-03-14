import { useCallback } from 'react';
import { flattenFileList } from '@/utils/fileList';
import { useLatestCallback } from './useLatestCallback';
import type { RefCallback } from 'react';

export const usePaste = (onPaste: (files: File[]) => void) => {
  const onPasteLatest = useLatestCallback(onPaste);

  const ref = useCallback<RefCallback<HTMLElement>>(
    target => {
      if (!target) {
        return;
      }

      const handlePaste = (event: ClipboardEvent) => {
        const files = flattenFileList(event.clipboardData?.files ?? null);
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

  return ref;
};
