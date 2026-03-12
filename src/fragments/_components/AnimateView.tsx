import { ViewTransition } from 'react';
import type { ReactNode } from 'react';

export type AnimateViewName = 'root' | 'entries';

type AnimateViewProps = {
  name?: AnimateViewName;
  animateUpdate?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export const AnimateView = ({ name, animateUpdate, disabled, children }: AnimateViewProps) =>
  disabled ? (
    <>{children}</>
  ) : (
    <ViewTransition
      name={name && `__app_${name}`}
      enter="animate-fade-in-lg"
      exit="animate-fade-out-lg"
      update={!animateUpdate ? 'none' : undefined}
    >
      {children}
    </ViewTransition>
  );
