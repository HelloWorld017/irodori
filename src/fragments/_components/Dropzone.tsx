import { AnimatePresence, motion } from 'motion/react';
import { useRef } from 'react';
import { IconSquarePlus } from '@/fragments/_icons';
import { useDropzone } from '@/hooks/useDropzone';
import { classes } from '@/utils/classes';

type DropzoneProps = {
  onDrop: (files: File[]) => void;
  title?: string;
  description?: string;
  className?: string;
  static?: boolean;
  accept?: string;
};

const toFiles = (fileList: FileList | null) =>
  Array.from({ length: fileList?.length ?? 0 }, (_, index) => fileList?.item(index)).filter(
    (file): file is File => file !== null
  );

export const Dropzone = ({
  onDrop,
  title = '파일을 여기에 놓으세요',
  description = '드래그한 파일을 바로 추가할 수 있어요.',
  className,
  static: isStatic = false,
  accept,
}: DropzoneProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { ref, isDropTargetActive, isGlobalDragging } = useDropzone({ onDrop });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = toFiles(event.target.files);
    event.target.value = '';

    if (files.length > 0) {
      onDrop(files);
    }
  };

  const panel = (
    <motion.div
      ref={ref}
      initial={isStatic ? false : { opacity: 0, y: 12, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDropTargetActive ? 1.02 : 1,
      }}
      exit={isStatic ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0.12, visualDuration: 0.28 }}
      className={classes(
        `flex w-full flex-col rounded-[2.4rem] bg-base-background/95 p-4 shadow-elevated
        backdrop-blur-xl`,
        isStatic ? 'max-w-none' : 'max-w-md',
        isDropTargetActive && 'bg-elevated-background',
        className
      )}
    >
      <div
        className={classes(
          'rounded-[1.6rem] border border-dashed border-line p-4 py-8',
          isDropTargetActive && 'border-highlight'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={classes(
              `flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated-background
              text-2xl transition`,
              isDropTargetActive && 'bg-highlight text-highlight-foreground'
            )}
          >
            <IconSquarePlus />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold tracking-tight text-primary">{title}</p>
            <p className="text-sm leading-6 text-secondary">{description}</p>
          </div>
          {isStatic ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-highlight px-4 py-2 text-sm font-medium
                text-highlight-foreground transition hover:bg-highlight-hover"
            >
              파일 선택
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );

  if (isStatic) {
    return panel;
  }

  return (
    <AnimatePresence>
      {isGlobalDragging ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop px-4 py-8"
        >
          {panel}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
