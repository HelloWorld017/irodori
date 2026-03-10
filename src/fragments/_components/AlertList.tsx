import { Description, DialogTitle } from '@headlessui/react';
import { AnimatePresence } from 'motion/react';
import { AnimatedModal } from '@/fragments/_components/AnimatedModal';
import {
  useAcceptAlert,
  useCurrentAlert,
  useDismissAlert,
} from '@/fragments/_providers/AlertProvider';
import { classes } from '@/utils/classes';

export const AlertList = () => {
  const currentAlert = useCurrentAlert();
  const acceptAlert = useAcceptAlert();
  const dismissAlert = useDismissAlert();

  return (
    <AnimatePresence mode="wait">
      {currentAlert ? (
        <AnimatedModal
          key={currentAlert.id}
          role="alertdialog"
          dismissable={currentAlert.variant === 'confirm'}
          onClose={() => dismissAlert(currentAlert.id)}
          className="relative z-10 w-full max-w-sm rounded-2xl bg-base-background p-5
            shadow-elevated ring-1 ring-line"
          rootClassName="z-60"
          animate={false}
        >
          <DialogTitle as="h2" className="text-lg font-semibold text-primary">
            {currentAlert.title}
          </DialogTitle>

          <Description
            as="p"
            className="mt-2 text-sm leading-relaxed font-medium whitespace-pre-line text-secondary"
          >
            {currentAlert.message}
          </Description>

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
        </AnimatedModal>
      ) : null}
    </AnimatePresence>
  );
};
