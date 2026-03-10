import { PopoverPanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentProps } from 'react';

type AnimatedPopoverPanelProps = Omit<ComponentProps<typeof PopoverPanel>, 'as' | 'static'> & {
  open: boolean;
};

export const AnimatedPopoverPanel = ({ open, ...props }: AnimatedPopoverPanelProps) => (
  <AnimatePresence>
    {open ? (
      <PopoverPanel
        {...props}
        static
        as={motion.div}
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.2, ease: 'easeOut' },
        }}
        exit={{
          opacity: 0,
          y: 4,
          scale: 0.98,
          transition: { duration: 0.2, ease: 'easeOut' },
        }}
      />
    ) : null}
  </AnimatePresence>
);
