import { AssetsRepository } from './AssetsRepository';
import { EntriesRepository } from './EntriesRepository';
import { EntryAssetsRepository } from './EntryAssetsRepository';
import { EntryDraftsRepository } from './EntryDraftsRepository';
import { EntryStickersRepository } from './EntryStickersRepository';
import { EntryTagsRepository } from './EntryTagsRepository';
import { NotebooksRepository } from './NotebooksRepository';
import { StickersRepository } from './StickersRepository';
import { SyncDocumentsRepository } from './SyncDocumentsRepository';
import { TagCategoriesRepository } from './TagCategoriesRepository';
import { TagsRepository } from './TagsRepository';
import type { AssetsDatabase } from './AssetsRepository';
import type { EntriesDatabase } from './EntriesRepository';
import type { EntryAssetsDatabase } from './EntryAssetsRepository';
import type { EntryDraftsDatabase } from './EntryDraftsRepository';
import type { EntryStickersDatabase } from './EntryStickersRepository';
import type { EntryTagsDatabase } from './EntryTagsRepository';
import type { NotebooksDatabase } from './NotebooksRepository';
import type { StickersDatabase } from './StickersRepository';
import type { SyncDocumentsDatabase } from './SyncDocumentsRepository';
import type { TagCategoriesDatabase } from './TagCategoriesRepository';
import type { TagsDatabase } from './TagsRepository';
import type { Kysely, Transaction } from 'kysely';

// prettier-ignore
export type Database =
  & AssetsDatabase
  & EntriesDatabase
  & EntryDraftsDatabase
  & EntryAssetsDatabase
  & EntryStickersDatabase
  & EntryTagsDatabase
  & NotebooksDatabase
  & StickersDatabase
  & SyncDocumentsDatabase
  & TagCategoriesDatabase
  & TagsDatabase;

export type Executor = Kysely<Database> | Transaction<Database>;

export type Repositories = {
  [K in keyof typeof RepositoryClasses]: InstanceType<(typeof RepositoryClasses)[K]>;
} & {
  withTransaction<T>(callback: (executor: Transaction<Database>) => Promise<T>): Promise<T>;
};

export const RepositoryClasses = {
  assets: AssetsRepository,
  entries: EntriesRepository,
  entryDrafts: EntryDraftsRepository,
  entryAssets: EntryAssetsRepository,
  entryStickers: EntryStickersRepository,
  entryTags: EntryTagsRepository,
  notebooks: NotebooksRepository,
  stickers: StickersRepository,
  syncDocuments: SyncDocumentsRepository,
  tagCategories: TagCategoriesRepository,
  tags: TagsRepository,
};
