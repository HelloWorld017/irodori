import { useCallback, useEffect, useRef, useState } from 'react';
import { flattenFileList } from '@/utils/fileList';
import { useLatestCallback } from './useLatestCallback';
import type { RefCallback } from 'react';

type UseDropzoneProps = {
  onDrop: (files: File[]) => void;
};

const hasTransferFiles = (dataTransfer: DataTransfer | null) =>
  Array.from(dataTransfer?.types ?? []).includes('Files');

export const useDropzone = ({ onDrop }: UseDropzoneProps) => {
  const onDropLatest = useLatestCallback(onDrop);
  const targetDragCounterRef = useRef(0);
  const globalDragCounterRef = useRef(0);
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const updateTargetDragCounter = useCallback((nextValue: number) => {
    targetDragCounterRef.current = Math.max(nextValue, 0);
    setIsDropTargetActive(targetDragCounterRef.current > 0);
  }, []);

  const updateGlobalDragCounter = useCallback(
    (nextValue: number) => {
      globalDragCounterRef.current = Math.max(nextValue, 0);
      const nextIsGlobalDragging = globalDragCounterRef.current > 0;

      setIsGlobalDragging(nextIsGlobalDragging);
      if (!nextIsGlobalDragging) {
        updateTargetDragCounter(0);
      }
    },
    [updateTargetDragCounter]
  );

  const resetDragState = useCallback(() => {
    updateTargetDragCounter(0);
    updateGlobalDragCounter(0);
  }, [updateGlobalDragCounter, updateTargetDragCounter]);

  useEffect(() => {
    const handleWindowDragEnter = (event: DragEvent) => {
      if (!hasTransferFiles(event.dataTransfer)) {
        return;
      }

      updateGlobalDragCounter(globalDragCounterRef.current + 1);
      event.preventDefault();
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      if (!hasTransferFiles(event.dataTransfer)) {
        return;
      }

      updateGlobalDragCounter(globalDragCounterRef.current - 1);
    };

    const handleWindowDragOver = (event: DragEvent) => {
      if (!hasTransferFiles(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
    };

    const handleWindowDrop = (event: DragEvent) => {
      if (!hasTransferFiles(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      resetDragState();
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragend', resetDragState);
    window.addEventListener('blur', resetDragState);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('dragend', resetDragState);
      window.removeEventListener('blur', resetDragState);
    };
  }, [resetDragState, updateGlobalDragCounter]);

  const ref = useCallback<RefCallback<HTMLElement>>(
    target => {
      if (!target) {
        return;
      }

      const handleDragEnter = (event: DragEvent) => {
        if (!hasTransferFiles(event.dataTransfer)) {
          return;
        }

        updateTargetDragCounter(targetDragCounterRef.current + 1);
        event.preventDefault();
      };

      const handleDragLeave = (event: DragEvent) => {
        if (!hasTransferFiles(event.dataTransfer)) {
          return;
        }

        updateTargetDragCounter(targetDragCounterRef.current - 1);
      };

      const handleDragOver = (event: DragEvent) => {
        if (!hasTransferFiles(event.dataTransfer)) {
          return;
        }

        if (targetDragCounterRef.current === 0) {
          updateTargetDragCounter(1);
        }

        event.preventDefault();
      };

      const handleDrop = (event: DragEvent) => {
        if (!hasTransferFiles(event.dataTransfer)) {
          return;
        }

        const files = flattenFileList(event.dataTransfer?.files ?? null);
        event.preventDefault();

        if (files.length > 0) {
          onDropLatest(files);
        }

        resetDragState();
      };

      const handleClick = () => {
        resetDragState();
      };

      target.addEventListener('dragenter', handleDragEnter);
      target.addEventListener('dragleave', handleDragLeave);
      target.addEventListener('dragover', handleDragOver);
      target.addEventListener('drop', handleDrop);
      target.addEventListener('click', handleClick);

      return () => {
        target.removeEventListener('dragenter', handleDragEnter);
        target.removeEventListener('dragleave', handleDragLeave);
        target.removeEventListener('dragover', handleDragOver);
        target.removeEventListener('drop', handleDrop);
        target.removeEventListener('click', handleClick);
      };
    },
    [onDropLatest, resetDragState, updateTargetDragCounter]
  );

  return {
    ref,
    isDropTargetActive,
    isGlobalDragging,
    resetDragState,
  };
};
