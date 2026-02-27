import { createContext, useContext, useEffectEvent, useMemo } from 'react';
import { useCreateSignal, useSignal } from '@/hooks/useSignal';
import type { Signal } from '@/hooks/useSignal';
import type { ReactNode } from 'react';

export const buildContext = <T, TProps = Record<string, unknown>>(
  useContextValue: (props: TProps) => T
) => {
  const Context = createContext<Signal<T>>(null as never);
  const Provider = (props: { children: ReactNode } & TProps) => {
    const contextValue = useContextValue(props);
    const contextSignal = useCreateSignal(contextValue);
    return <Context value={contextSignal}>{props.children}</Context>;
  };

  Provider.displayName = `${useContextValue.name?.slice(4) ?? ''}Provider`;

  const useSelectedContext = <TSelected,>(selector: (value: T) => TSelected) => {
    const contextSignal = useContext(Context);
    const latestSelector = useEffectEvent(selector);
    const selectedSignal = useMemo<Signal<TSelected>>(
      () => ({
        get: () => latestSelector(contextSignal.get()),
        subscribe: onUpdate => contextSignal.subscribe(value => onUpdate(latestSelector(value))),
      }),
      [contextSignal, latestSelector]
    );

    return useSignal(selectedSignal);
  };

  return [Provider, useSelectedContext] as const;
};
