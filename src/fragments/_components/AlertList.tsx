import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import {
  useAcceptAlert,
  useCurrentAlert,
  useDismissAlert,
} from '@/fragments/_providers/AlertProvider';
import { classes } from '@/utils/classes';

export const AlertList = () => {
  const id = useId();
  const currentAlert = useCurrentAlert();
  const acceptAlert = useAcceptAlert();
  const dismissAlert = useDismissAlert();

  return (
    <AnimatePresence mode="wait">
      {currentAlert ? (
        <motion.div
          key={currentAlert.id}
          className="fixed inset-0 z-60 flex items-center justify-center px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {currentAlert.variant === 'confirm' ? (
            <button
              type="button"
              aria-label="알림 닫기"
              className="absolute inset-0 bg-backdrop"
              onClick={() => dismissAlert(currentAlert.id)}
            />
          ) : (
            <div className="absolute inset-0 bg-backdrop" />
          )}

          <motion.section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-title-${currentAlert.id}`}
            aria-describedby={`${id}-message-${currentAlert.id}`}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-base-background p-5
              shadow-elevated ring-1 ring-line"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h2
              id={`${id}-title-${currentAlert.id}`}
              className="text-lg font-semibold text-primary"
            >
              {currentAlert.title}
            </h2>

            <p
              id={`${id}-message-${currentAlert.id}`}
              className="mt-2 text-sm leading-relaxed font-medium whitespace-pre-line
                text-secondary"
            >
              {currentAlert.message}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              {currentAlert.variant === 'confirm' ? (
                <button
                  type="button"
                  onClick={() => dismissAlert(currentAlert.id)}
                  className="rounded-xl border border-line bg-base-background px-4 py-2 text-sm
                    font-medium text-primary transition hover:bg-elevated-background"
                >
                  {currentAlert.cancelLabel}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => acceptAlert(currentAlert.id)}
                className={classes(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition',
                  currentAlert.kind === 'warning'
                    ? 'bg-highlight text-highlight-foreground hover:bg-highlight-hover'
                    : 'bg-primary text-base-background hover:opacity-90'
                )}
              >
                {currentAlert.confirmLabel}
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
