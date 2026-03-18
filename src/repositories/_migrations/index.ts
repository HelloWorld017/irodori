import { initializeMigration } from './0000_initialize';
import { fieldsMigration } from './0001_fields';
import type { Database } from '@/repositories';
import type { Migration } from '@/types/Migration';

export const migrations = [initializeMigration, fieldsMigration].sort(
  (left, right) => left.version - right.version
) satisfies Migration<Database>[];
