type EntriesDetailFragmentProps = {
  edit?: boolean;
};

export const EntriesDetailFragment = ({ edit }: EntriesDetailFragmentProps) => `Hello!: ${edit}`;
