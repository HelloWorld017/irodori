import { useCallback, useEffect, useRef, useState } from 'react';
import { buildContext } from '@/utils/context';

export type AlertKind = 'default' | 'warning';

type BaseAlertInput = {
  title: string;
  message: string;
  kind?: AlertKind;
  confirmLabel?: string;
};

export type AlertInput = BaseAlertInput;

export type ConfirmInput = BaseAlertInput & {
  cancelLabel?: string;
};

type AlertVariant = 'alert' | 'confirm';

export type AlertItem = {
  id: number;
  title: string;
  message: string;
  kind: AlertKind;
  variant: AlertVariant;
  confirmLabel: string;
  cancelLabel: string | null;
};

const DEFAULT_CONFIRM_LABEL = '확인';
const DEFAULT_CANCEL_LABEL = '취소';

const [AlertProvider, useAlertState] = buildContext(() => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const nextAlertIdRef = useRef(0);
  const resolveMapRef = useRef(new Map<number, (value: boolean | undefined) => void>());

  const enqueueAlert = useCallback(
    (item: Omit<AlertItem, 'id'>, resolve: (value: boolean | undefined) => void) => {
      const id = nextAlertIdRef.current + 1;
      nextAlertIdRef.current = id;
      resolveMapRef.current.set(id, resolve);
      setAlerts(currentAlerts => [...currentAlerts, { id, ...item }]);
    },
    []
  );

  const resolveAlert = useCallback((id: number, value: boolean | undefined) => {
    const resolve = resolveMapRef.current.get(id);
    if (resolve === undefined) {
      return;
    }

    resolveMapRef.current.delete(id);
    resolve(value);
    setAlerts(currentAlerts => currentAlerts.filter(alert => alert.id !== id));
  }, []);

  const alert = useCallback(
    (input: AlertInput) =>
      new Promise<void>(resolve => {
        enqueueAlert(
          {
            title: input.title,
            message: input.message,
            kind: input.kind ?? 'default',
            variant: 'alert',
            confirmLabel: input.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
            cancelLabel: null,
          },
          () => {
            resolve();
          }
        );
      }),
    [enqueueAlert]
  );

  const confirm = useCallback(
    (input: ConfirmInput) =>
      new Promise<boolean>(resolve => {
        enqueueAlert(
          {
            title: input.title,
            message: input.message,
            kind: input.kind ?? 'default',
            variant: 'confirm',
            confirmLabel: input.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
            cancelLabel: input.cancelLabel ?? DEFAULT_CANCEL_LABEL,
          },
          value => {
            resolve(Boolean(value));
          }
        );
      }),
    [enqueueAlert]
  );

  const acceptAlert = useCallback(
    (id: number) => {
      resolveAlert(id, true);
    },
    [resolveAlert]
  );

  const dismissAlert = useCallback(
    (id: number) => {
      resolveAlert(id, false);
    },
    [resolveAlert]
  );

  useEffect(
    () => () => {
      resolveMapRef.current.forEach(resolve => {
        resolve(undefined);
      });
      resolveMapRef.current.clear();
    },
    []
  );

  return {
    alerts,
    alert,
    confirm,
    acceptAlert,
    dismissAlert,
  };
});

export { AlertProvider };
export const useAlert = () => useAlertState(state => state.alert);
export const useConfirm = () => useAlertState(state => state.confirm);
export const useCurrentAlert = () => useAlertState(state => state.alerts[0] ?? null);
export const useAcceptAlert = () => useAlertState(state => state.acceptAlert);
export const useDismissAlert = () => useAlertState(state => state.dismissAlert);
