import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { NAMESPACE } from '@/constants/common';
import { useConfirm } from '../_providers/AlertProvider';
import { useShowToast } from '../_providers/ToastProvider';

export const ServiceWorkerManager = () => {
  const confirm = useConfirm();
  const showToast = useShowToast();
  useEffect(() => {
    const updateSW = registerSW({
      async onNeedRefresh() {
        const shouldUpdateSW = await confirm({
          title: '업데이트 알림',
          message: '새 버전이 사용 가능합니다. 지금 새로고침할까요?',
        });

        if (shouldUpdateSW) {
          await updateSW(true);
        }
      },
    });

    if ('serviceWorker' in navigator) {
      const installingKey = `${NAMESPACE}__installing`;
      const isInstalling = window.sessionStorage.getItem(installingKey);
      if (isInstalling && !window.crossOriginIsolated) {
        showToast({
          durationMs: -1,
          kind: 'error',
          message: '앱 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.',
        });

        window.sessionStorage.removeItem(installingKey);
        return;
      }

      if (window.crossOriginIsolated === false) {
        showToast({
          durationMs: -1,
          kind: 'error',
          message: '앱을 초기화하고 있습니다. 완료되는 대로 새로고침됩니다.',
        });

        void navigator.serviceWorker.ready.then(() => {
          window.sessionStorage.setItem(installingKey, 'true');
          window.location.reload();
        });

        return;
      }
    }
  }, [confirm, showToast]);

  return null;
};
