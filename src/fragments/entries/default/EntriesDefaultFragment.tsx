import { AnimateView } from '@/fragments/_components/AnimateView';

export const EntriesDefaultFragment = () => (
  <AnimateView>
    <div className="hidden h-full items-center justify-center text-xl text-tertiary lg:flex">
      새 일기를 추가하거나, 이전의 일기를 확인해보세요.
    </div>
  </AnimateView>
);
