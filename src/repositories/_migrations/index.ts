import { initializeMigration } from './0000_initialize';
import type { Database } from '@/repositories';
import type { Migration } from '@/types/Migration';

export const migrations = [initializeMigration].sort(
  (left, right) => left.version - right.version
) satisfies Migration<Database>[];
