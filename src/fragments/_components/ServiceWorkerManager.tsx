import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
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
      if (!window.crossOriginIsolated) {
        showToast({
          durationMs: -1,
          kind: 'error',
          message: '앱을 초기화하고 있습니다. 완료되는 대로 새로고침됩니다.',
        });

        void navigator.serviceWorker.ready.then(() => {
          window.location.reload();
        });
      }
    }
  }, [confirm, showToast]);

  return null;
};
