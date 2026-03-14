import { AssetsService } from './AssetsService';
import { EntriesService } from './EntriesService';
import { EntryAssetsService } from './EntryAssetsService';
import { EntryDraftsService } from './EntryDraftsService';
import { EntryMetadataService } from './EntryMetadataService';
import { NotebooksService } from './NotebooksService';
import { StickersService } from './StickersService';
import { SyncService } from './SyncService';
import { TagCategoriesService } from './TagCategoriesService';
import { TagsService } from './TagsService';

export type Services = {
  [K in keyof typeof ServiceClasses]: InstanceType<(typeof ServiceClasses)[K]>;
};

export const ServiceClasses = {
  assets: AssetsService,
  entries: EntriesService,
  entryAssets: EntryAssetsService,
  entryDrafts: EntryDraftsService,
  entryMetadata: EntryMetadataService,
  notebooks: NotebooksService,
  stickers: StickersService,
  sync: SyncService,
  tagCategories: TagCategoriesService,
  tags: TagsService,
};
