import { AnimatePresence, motion } from 'motion/react';
import { match } from 'ts-pattern';
import { IconX } from '@/fragments/_icons';
import { useDismissToast, useToasts } from '@/fragments/_providers/ToastProvider';
import { classes } from '@/utils/classes';
import type { ToastItem } from '@/fragments/_providers/ToastProvider';

type ToastProps = {
  toast: ToastItem;
  index: number;
  onDismiss: (id: number) => void;
};

const Toast = ({ toast, index, onDismiss }: ToastProps) => {
  const toneClassName = match(toast.kind)
    .with('success', () => classes('bg-success text-success-foreground'))
    .with('error', () => classes('bg-error text-error-foreground'))
    .with('info', () => classes('bg-info text-info-foreground'))
    .exhaustive();

  return (
    <motion.div
      layout
      className={classes(
        `pointer-events-auto relative flex items-center justify-between gap-9 rounded-xl px-5 py-4
        shadow-md`,
        toneClassName
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: Math.max(0, 1 - index * 0.1),
        scale: Math.max(0, 1 - index * 0.005),
        y: 0,
      }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <p className="font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="닫기"
        className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none
          transition hover:bg-white/10"
      >
        <IconX />
      </button>
    </motion.div>
  );
};

export const ToastList = () => {
  const toasts = useToasts();
  const dismissToast = useDismissToast();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto w-full max-w-md">
        <div className="position-relative flex flex-col -space-y-8">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast, index, { length }) => (
              <Toast
                key={toast.id}
                toast={toast}
                index={length - index - 1}
                onDismiss={dismissToast}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
