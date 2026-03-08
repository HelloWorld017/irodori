import { useCallback, useLayoutEffect, useRef } from 'react';

export const useLatestCallback = <TParameter extends unknown[], TReturnValue>(
  callback: (...args: TParameter) => TReturnValue
) => {
  const callbackRef = useRef<(...args: TParameter) => TReturnValue>(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const latestCallback = useCallback((...args: TParameter) => callbackRef.current(...args), []);
  return latestCallback;
};
