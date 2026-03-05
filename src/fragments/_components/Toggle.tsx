import { classes } from '@/utils/classes';
import type { JSX } from 'react';

export const Toggle = ({ className, ...props }: JSX.IntrinsicElements['input']) => (
  <input
    type="checkbox"
    className={classes(
      `relative h-[30px] w-[60px] appearance-none rounded-full bg-tertiary transition-all
      after:absolute after:top-[3px] after:left-[3px] after:h-[24px] after:w-[24px]
      after:rounded-full after:bg-white after:shadow-[2px_4px_6px_rgba(0,0,0,0.2)]
      after:transition-all checked:bg-highlight checked:after:left-[33px]
      checked:after:shadow-[-2px_4px_3px_rgba(0,0,0,0.05)] focus-visible:ring-2
      focus-visible:ring-highlight focus-visible:ring-offset-2
      focus-visible:ring-offset-base-background focus-visible:outline-none
      disabled:after:bg-tertiary`,
      className
    )}
    {...props}
  />
);
