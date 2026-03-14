import { useRef } from 'react';
import type { Ref as RefNullable, RefCallback, RefObject } from 'react';

type Ref<T> = NonNullable<RefNullable<T>>;
type Cleanups<T> = Map<RefCallback<T>, () => void>;

export function useMergedRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  const refsSetRef = useRef<Set<Ref<T>>>(new Set());
  const refsSet = refsSetRef.current;

  const cleanupsRef = useRef<Cleanups<T>>(new Map());
  const valueRef = useRef<T>(null);

  for (const ref of refsSet) {
    if (!refs.includes(ref)) {
      refsSet.delete(ref);
      if (valueRef.current !== null) {
        unsetRef(ref, cleanupsRef);
      }
    }
  }

  for (const ref of refs) {
    if (ref !== null && ref !== undefined && !refsSet.has(ref)) {
      refsSet.add(ref);
      if (valueRef.current !== null) {
        setRef(ref, valueRef.current, cleanupsRef);
      }
    }
  }

  const outputRef = useRef<RefCallback<T>>(null);
  outputRef.current ??= (value: T) => {
    valueRef.current = value;
    for (const ref of refsSet) {
      setRef(ref, value, cleanupsRef);
    }

    return () => {
      valueRef.current = null;
      for (const ref of refsSet) {
        unsetRef(ref, cleanupsRef);
      }
    };
  };

  return outputRef.current;
}

const setRef = <T>(ref: Ref<T>, value: T, cleanupsRef: RefObject<Cleanups<T>>) => {
  if (typeof ref === 'function') {
    const cleanup = ref(value);
    if (typeof cleanup === 'function') {
      cleanupsRef.current.set(ref, cleanup);
    }
  } else {
    ref.current = value;
  }
};

const unsetRef = <T>(ref: Ref<T>, cleanupsRef: RefObject<Cleanups<T>>) => {
  if (typeof ref === 'function') {
    const cleanup = cleanupsRef.current.get(ref);
    if (cleanup) {
      cleanup();
      cleanupsRef.current.delete(ref);
    } else {
      ref(null);
    }
  } else {
    ref.current = null;
  }
};
