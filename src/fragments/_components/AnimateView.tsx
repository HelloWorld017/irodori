import { ViewTransition } from 'react';
import type { ReactNode } from 'react';

export type AnimateViewName = 'root' | 'entries';

type AnimateViewProps = {
  name?: AnimateViewName;
  animateUpdate?: boolean;
  children: ReactNode;
};

export const AnimateView = ({ name, animateUpdate, children }: AnimateViewProps) => (
  <ViewTransition
    name={name && `__app_${name}`}
    enter="animate-fade-in-view"
    exit="animate-fade-out-view"
    update={!animateUpdate ? 'none' : undefined}
  >
    {children}
  </ViewTransition>
);
