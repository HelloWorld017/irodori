import type { Kysely, Transaction } from 'kysely';

export type MigrationExecutor<TDatabase> = Kysely<TDatabase> | Transaction<TDatabase>;

export type Migration<TDatabase> = {
  version: number;
  migrate(executor: MigrationExecutor<TDatabase>): Promise<void>;
};
