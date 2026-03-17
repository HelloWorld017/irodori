import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AnimateView } from './AnimateView';
import type { AnimateViewAnimation, AnimateViewName } from './AnimateView';
import type { ReactNode } from 'react';

type AsyncBoundaryDefaultErrorProps = {
  message: string;
  reset: () => void;
};

const AsyncBoundaryDefaultError = ({ message, reset }: AsyncBoundaryDefaultErrorProps) => {
  const { reset: resetQuery } = useQueryErrorResetBoundary();
  const onReset = () => {
    resetQuery();
    reset();
  };

  return (
    <section className="flex flex-col items-center gap-4 p-6 py-12">
      <p className="text-center text-sm text-secondary">{message}</p>
      <button
        type="button"
        onClick={() => onReset()}
        className="mt-4 rounded-lg bg-highlight px-3 py-2 text-sm font-medium
          text-highlight-foreground transition hover:bg-highlight-hover"
      >
        다시 시도
      </button>
    </section>
  );
};

type AsyncBoundaryDefaultLoadingProps = {
  message: string;
};

const AsyncBoundaryDefaultLoading = ({ message }: AsyncBoundaryDefaultLoadingProps) => (
  <section className="p-6 py-12">
    <p className="text-center text-sm text-secondary">{message}</p>
  </section>
);

type ErrorBoundaryHandle = { error: unknown; resetErrorBoundary: () => void };
type AsyncBoundaryRenderDescriptor = {
  default: ReactNode;
  loading: string | ReactNode;
  error: string | ReactNode | ((props: ErrorBoundaryHandle) => ReactNode | string);
};

type AsyncBoundaryRenderFn = (descriptor: AsyncBoundaryRenderDescriptor) => ReactNode;
type AsyncBoundaryProps = {
  animateView?: boolean | AnimateViewAnimation;
  animateViewName?: AnimateViewName;
  defaultClassName?: string;
  children: AsyncBoundaryRenderDescriptor | ((render: AsyncBoundaryRenderFn) => ReactNode);
};

export const AsyncBoundary = ({ children, animateView, animateViewName }: AsyncBoundaryProps) => {
  const renderContents =
    typeof children === 'function' ? children : (render: AsyncBoundaryRenderFn) => render(children);

  const wrapTransition = (node: ReactNode) =>
    animateView ? (
      <AnimateView
        animation={typeof animateView === 'string' ? animateView : undefined}
        name={animateViewName}
      >
        {node}
      </AnimateView>
    ) : (
      node
    );

  const errorFallback = ({ error, resetErrorBoundary }: ErrorBoundaryHandle) =>
    renderContents(descriptor => {
      const node =
        typeof descriptor.error === 'function'
          ? descriptor.error({ error, resetErrorBoundary })
          : descriptor.error;

      return wrapTransition(
        typeof node === 'string' ? (
          <AsyncBoundaryDefaultError message={node} reset={resetErrorBoundary} />
        ) : (
          node
        )
      );
    });

  const fallback = renderContents(descriptor =>
    wrapTransition(
      typeof descriptor.loading === 'string' ? (
        <AsyncBoundaryDefaultLoading message={descriptor.loading} />
      ) : (
        descriptor.loading
      )
    )
  );

  const contents = renderContents(descriptor => wrapTransition(descriptor.default));

  return (
    <ErrorBoundary fallbackRender={errorFallback}>
      <Suspense fallback={fallback}>{contents}</Suspense>
    </ErrorBoundary>
  );
};
