import { PopoverPanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentProps } from 'react';

type BasePopoverProps = Omit<ComponentProps<typeof PopoverPanel>, 'as' | 'static'>;
type AnimatedPopoverPanelProps = BasePopoverProps &
  ({ animate?: true; open: boolean } | { animate: false });

export const AnimatedPopoverPanel = (props: AnimatedPopoverPanelProps) => {
  const panel = (
    <PopoverPanel
      {...props}
      static
      as={motion.div}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: 4,
        scale: 0.98,
      }}
    />
  );

  if (props.animate === false) {
    return panel;
  }

  return <AnimatePresence>{props.open ? panel : null}</AnimatePresence>;
};
