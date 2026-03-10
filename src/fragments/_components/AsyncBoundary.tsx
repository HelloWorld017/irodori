import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type AsyncBoundaryDefaultErrorProps = {
  message: string;
  reset: () => void;
};

const AsyncBoundaryDefaultError = ({ reset, message }: AsyncBoundaryDefaultErrorProps) => {
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

const AsyncBoundaryDefaultLoading = ({ message }: { message: string }) => (
  <section className="p-6 py-12">
    <p className="text-center text-sm text-secondary">{message}</p>
  </section>
);

type AsyncBoundaryProps = {
  children: {
    default: ReactNode;
    loading: string | ReactNode;
    error:
      | string
      | ReactNode
      | ((props: { error: unknown; reset: () => void }) => ReactNode | string);
  };
};

export const AsyncBoundary = ({ children }: AsyncBoundaryProps) => {
  const errorFallback = ({
    error,
    resetErrorBoundary,
  }: {
    error: unknown;
    resetErrorBoundary: () => void;
  }) => {
    const node =
      typeof children.error === 'function'
        ? children.error({ error, reset: resetErrorBoundary })
        : children.error;

    if (typeof node === 'string') {
      return <AsyncBoundaryDefaultError message={node} reset={resetErrorBoundary} />;
    }

    return node;
  };

  const fallback =
    typeof children.loading === 'string' ? (
      <AsyncBoundaryDefaultLoading message={children.loading} />
    ) : (
      children.loading
    );

  return (
    <ErrorBoundary fallbackRender={errorFallback}>
      <Suspense fallback={fallback}>{children.default}</Suspense>
    </ErrorBoundary>
  );
};
