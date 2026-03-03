import { useEnsureDatabase } from '@/hooks/useEnsureDatabase';
import { EntriesFinder } from './_components/EntriesFinder';

export const EntriesFragment = () => {
  useEnsureDatabase();

  return (
    <div>
      <EntriesFinder />
    </div>
  );
};
