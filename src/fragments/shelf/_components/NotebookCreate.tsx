import { IconBookPlus } from '@/fragments/_icons';

type NotebookCreateProps = {
  onCreate: () => void;
};

export const NotebookCreate = ({ onCreate }: NotebookCreateProps) => (
  <button className="flex gap-6" type="button" onClick={() => onCreate()}>
    <div
      className="relative flex aspect-[3/4] w-28 flex-col items-center justify-center gap-2
        overflow-hidden rounded-xl border-2 border-dashed border-tertiary text-2xl text-tertiary
        transition hover:opacity-50 md:w-36"
    >
      <IconBookPlus />
      <h2 className="text-base font-semibold">새로 만들기</h2>
    </div>
  </button>
);
