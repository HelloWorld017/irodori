import { classes } from '@/utils/classes';
import type { JSX } from 'react';

export const Toggle = ({ className, ...props }: JSX.IntrinsicElements['input']) => (
  <input
    type="checkbox"
    className={classes(
      `relative flex h-[30px] w-[60px] appearance-none items-center justify-start rounded-full
      bg-tertiary p-[3px] transition-all before:flex before:flex-0 before:transition-all
      after:aspect-square after:h-full after:rounded-full after:bg-white
      after:shadow-[2px_4px_6px_rgba(0,0,0,0.2)] after:transition-all checked:bg-highlight
      checked:before:flex-1 checked:after:left-[calc(100%-6px)]
      checked:after:shadow-[-2px_4px_3px_rgba(0,0,0,0.05)] focus-visible:ring-2
      focus-visible:ring-highlight focus-visible:ring-offset-2
      focus-visible:ring-offset-base-background focus-visible:outline-none
      disabled:after:bg-tertiary`,
      className
    )}
    {...props}
  />
);
