import { ViewTransition } from 'react';
import type { ReactNode } from 'react';

export type AnimateViewName = 'root' | 'entries';
export type AnimateViewAnimation = 'fade' | 'fade-morph' | 'slide';

type AnimateViewProps = {
  name?: AnimateViewName;
  animation?: AnimateViewAnimation;
  animateUpdate?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export const AnimateView = ({
  name,
  animation,
  animateUpdate,
  disabled,
  children,
}: AnimateViewProps) =>
  disabled ? (
    <>{children}</>
  ) : (
    <ViewTransition
      name={name}
      default={`view-transition-${animation || 'fade'}`}
      update={!animateUpdate ? 'none' : undefined}
    >
      {children}
    </ViewTransition>
  );
