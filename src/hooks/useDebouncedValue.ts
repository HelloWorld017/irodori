import { debounce } from 'es-toolkit';
import { useEffect, useMemo, useState } from 'react';

type UseDebouncedValueOpts = {
  delay: number;
};

export const useDebouncedValue = <T>(value: T, opts: UseDebouncedValueOpts) => {
  const [state, setState] = useState(value);
  const debouncedSetState = useMemo(() => debounce(setState, opts.delay), [opts.delay]);
  useEffect(() => debouncedSetState(value), [value, debouncedSetState]);

  return state;
};
