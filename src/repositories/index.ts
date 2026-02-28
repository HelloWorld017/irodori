import { SyncDocumentsRepository } from './SyncDocumentsRepository';
import type { SyncDocumentsDatabase } from './SyncDocumentsRepository';

// prettier-ignore
export type Database =
  & SyncDocumentsDatabase;

export type Repositories = {
  [K in keyof typeof RepositoryClasses]: InstanceType<(typeof RepositoryClasses)[K]>;
};

export const RepositoryClasses = {
  syncDocuments: SyncDocumentsRepository,
};
