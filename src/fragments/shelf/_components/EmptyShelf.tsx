type EmptyShelfProps = {
  onCreate: () => void;
};

export const EmptyShelf = ({ onCreate }: EmptyShelfProps) => (
  <section
    className="rounded-2xl border border-dashed border-line bg-elevated-background p-8 text-center
      sm:p-10"
  >
    <h2 className="text-lg font-semibold text-primary">아직 노트북이 없어요</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-secondary">
      노트북을 하나 만들면 이곳에서 일상을 차곡차곡 모아둘 수 있어요.
    </p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-5 rounded-xl bg-highlight px-4 py-2 text-sm font-semibold
        text-highlight-foreground transition hover:bg-highlight-hover"
    >
      첫 노트북 만들기
    </button>
  </section>
);
