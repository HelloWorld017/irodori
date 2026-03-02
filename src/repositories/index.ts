import { NotebooksRepository } from './NotebooksRepository';
import { SyncDocumentsRepository } from './SyncDocumentsRepository';
import type { NotebooksDatabase } from './NotebooksRepository';
import type { SyncDocumentsDatabase } from './SyncDocumentsRepository';
import type { Kysely, Transaction } from 'kysely';

// prettier-ignore
export type Database =
  & NotebooksDatabase
  & SyncDocumentsDatabase;

export type Executor = Kysely<Database> | Transaction<Database>;

export type Repositories = {
  [K in keyof typeof RepositoryClasses]: InstanceType<(typeof RepositoryClasses)[K]>;
} & {
  withTransaction<T>(callback: (executor: Transaction<Database>) => Promise<T>): Promise<T>;
};

export const RepositoryClasses = {
  notebooks: NotebooksRepository,
  syncDocuments: SyncDocumentsRepository,
};
