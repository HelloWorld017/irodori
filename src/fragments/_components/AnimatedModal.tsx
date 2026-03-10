import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { classes } from '@/utils/classes';
import type { ReactNode } from 'react';

type BaseModalProps = {
  children: ReactNode;
  onClose: () => void;
  role?: 'dialog' | 'alertdialog';
  dismissable?: boolean;
  className?: string;
  backdropClassName?: string;
  containerClassName?: string;
  rootClassName?: string;
};

type AnimatedModalProps = BaseModalProps & ({ animate?: true; open: boolean } | { animate: false });

export const AnimatedModal = ({
  children,
  onClose,
  role = 'dialog',
  dismissable = true,
  className,
  backdropClassName,
  containerClassName,
  rootClassName,
  ...animateProps
}: AnimatedModalProps) => {
  const handleClose = dismissable ? onClose : () => {};

  const dialog = (
    <Dialog
      static
      open
      role={role}
      onClose={handleClose}
      className={classes('fixed inset-0 z-50', rootClassName)}
    >
      <DialogBackdrop
        as={motion.div}
        className={classes('fixed inset-0 bg-backdrop', backdropClassName)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
        exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
      />

      <div
        className={classes(
          'fixed inset-0 flex items-center justify-center px-4 py-8',
          containerClassName
        )}
      >
        <DialogPanel
          as={motion.div}
          className={className}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.2, ease: 'easeOut' },
          }}
          exit={{
            opacity: 0,
            y: 8,
            scale: 0.98,
            transition: { duration: 0.2, ease: 'easeOut' },
          }}
        >
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );

  if (animateProps.animate === false) {
    return dialog;
  }

  return <AnimatePresence>{animateProps.open ? dialog : null}</AnimatePresence>;
};
