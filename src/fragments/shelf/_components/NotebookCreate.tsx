type NotebookCreateProps = {
  onCreate: () => void;
};

export const NotebookCreate = ({ onCreate }: NotebookCreateProps) => (
  <div className="flex flex-col gap-3"></div>
);
