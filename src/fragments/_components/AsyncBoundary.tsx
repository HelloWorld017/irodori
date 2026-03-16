import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AnimateView } from './AnimateView';
import type { AnimateViewName } from './AnimateView';
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

type AsyncBoundaryRenderDescriptor = {
  default: ReactNode;
  loading: string | ReactNode;
  error:
    | string
    | ReactNode
    | ((props: { error: unknown; reset: () => void }) => ReactNode | string);
};

const AsyncBoundaryContents = ({ children }: { children: AsyncBoundaryRenderDescriptor }) => {
  const errorFallback = useCallback(
    ({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) => {
      const node =
        typeof children.error === 'function'
          ? children.error({ error, reset: resetErrorBoundary })
          : children.error;

      const nodeWithDefault =
        typeof node === 'string' ? (
          <AsyncBoundaryDefaultError message={node} reset={resetErrorBoundary} />
        ) : (
          node
        );

      return nodeWithDefault;
    },
    [children]
  );

  const fallback =
    typeof children.loading === 'string' ? (
      <AsyncBoundaryDefaultLoading message={children.loading} />
    ) : (
      children.loading
    );

  const result = (
    <ErrorBoundary fallbackRender={errorFallback}>
      <Suspense fallback={fallback}>{children.default}</Suspense>
    </ErrorBoundary>
  );

  return result;
};

type AsyncBoundaryRenderFn = (descriptor: AsyncBoundaryRenderDescriptor) => ReactNode;
type AsyncBoundaryProps = {
  animateView?: boolean;
  animateViewName?: AnimateViewName;
  animateViewMorphDisabled?: boolean;
  defaultClassName?: string;
  children: AsyncBoundaryRenderDescriptor | ((render: AsyncBoundaryRenderFn) => ReactNode);
};

export const AsyncBoundary = ({
  children,
  animateView,
  animateViewName,
  animateViewMorphDisabled,
}: AsyncBoundaryProps) => {
  const renderContents =
    typeof children === 'function' ? children : (render: AsyncBoundaryRenderFn) => render(children);

  const contents = renderContents(descriptor => (
    <AsyncBoundaryContents>{descriptor}</AsyncBoundaryContents>
  ));

  if (animateView) {
    return (
      <AnimateView
        animateUpdate
        morphDisabled={animateViewMorphDisabled ?? true}
        name={animateViewName}
      >
        {contents}
      </AnimateView>
    );
  }

  return contents;
};
