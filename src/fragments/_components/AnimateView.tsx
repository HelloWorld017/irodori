import { ViewTransition } from 'react';
import type { ReactNode } from 'react';

export type AnimateViewName = 'root' | 'entries';

type AnimateViewProps = {
  name?: AnimateViewName;
  animateUpdate?: boolean;
  disabled?: boolean;
  morphDisabled?: boolean;
  children: ReactNode;
};

export const AnimateView = ({
  name,
  animateUpdate,
  disabled,
  morphDisabled,
  children,
}: AnimateViewProps) =>
  disabled ? (
    <>{children}</>
  ) : (
    <ViewTransition
      name={name}
      default={morphDisabled ? 'view-transition-fade' : 'view-transition-fade-morph'}
      update={!animateUpdate ? 'none' : undefined}
    >
      {children}
    </ViewTransition>
  );
