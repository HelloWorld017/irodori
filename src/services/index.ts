import { EntriesService } from './EntriesService';
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
  entries: EntriesService,
  entryMetadata: EntryMetadataService,
  notebooks: NotebooksService,
  stickers: StickersService,
  sync: SyncService,
  tagCategories: TagCategoriesService,
  tags: TagsService,
};
