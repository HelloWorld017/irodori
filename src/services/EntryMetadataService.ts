import { toEntryStickerEntityId } from '@/repositories/EntryStickersRepository';
import { toEntryTagEntityId } from '@/repositories/EntryTagsRepository';
import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { EntrySticker } from '@/repositories/EntryStickersRepository';
import type { EntryTag } from '@/repositories/EntryTagsRepository';
import type { StickerViewItem } from '@/repositories/StickersRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';

type ReplaceTagsInput = {
  entryId: string;
  tagIds: string[];
};

type SetStickerInput = {
  entryId: string;
  slot: number;
  stickerId: string;
};

type ClearStickerInput = {
  entryId: string;
  slot: number;
};

export type EntryMetadataSticker = {
  slot: number;
  sticker: StickerViewItem;
};

export type EntryMetadata = {
  tags: TagViewItem[];
  stickers: EntryMetadataSticker[];
};

const toUniqueValues = <T>(values: T[]): T[] => [...new Set(values)];

export class EntryMetadataService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  async getByEntryId(entryId: string): Promise<EntryMetadata> {
    const [entryTags, entryStickers] = await Promise.all([
      this.repositories.entryTags.listEntryTagsByEntryId(entryId),
      this.repositories.entryStickers.listEntryStickersByEntryId(entryId),
    ]);

    const tagIds = toUniqueValues(entryTags.map(entryTag => entryTag.tagId));
    const stickerIds = toUniqueValues(entryStickers.map(entrySticker => entrySticker.stickerId));

    const [tags, stickers] = await Promise.all([
      this.repositories.tags.listTagsByIds(tagIds),
      this.repositories.stickers.listStickersByIds(stickerIds),
    ]);

    const tagsById = new Map(tags.map(tag => [tag.id, tag]));
    const stickersById = new Map(stickers.map(sticker => [sticker.id, sticker]));

    return {
      tags: entryTags
        .map(entryTag => tagsById.get(entryTag.tagId))
        .filter(tag => tag !== undefined),
      stickers: entryStickers
        .map(entrySticker => {
          const sticker = stickersById.get(entrySticker.stickerId);

          if (!sticker) {
            return null;
          }

          return {
            slot: entrySticker.slot,
            sticker,
          };
        })
        .filter(entrySticker => entrySticker !== null),
    };
  }

  async replaceTags(input: ReplaceTagsInput): Promise<void> {
    const now = Date.now();
    const nextTagIds = toUniqueValues(input.tagIds);

    await this.repositories.withTransaction(async trx => {
      const currentEntryTags = await this.repositories.entryTags.listEntryTagsByEntryId(
        input.entryId,
        trx
      );
      const currentTagIds = new Set(currentEntryTags.map(entryTag => entryTag.tagId));
      const nextTagIdSet = new Set(nextTagIds);

      const tagIdsToCreate = nextTagIds.filter(tagId => !currentTagIds.has(tagId));
      const entryTagsToDelete = currentEntryTags.filter(
        entryTag => !nextTagIdSet.has(entryTag.tagId)
      );

      const changedEntryTags: EntryTag[] = [];

      for (const tagId of tagIdsToCreate) {
        const createdEntryTag = await this.repositories.entryTags.upsertEntryTag(trx, {
          entryId: input.entryId,
          tagId,
          createdAt: now,
          updatedAt: now,
        });

        changedEntryTags.push(createdEntryTag);
      }

      for (const entryTag of entryTagsToDelete) {
        const deletedEntryTag = await this.repositories.entryTags.deleteEntryTag(trx, {
          entryId: input.entryId,
          tagId: entryTag.tagId,
          deletedAt: now,
        });

        if (deletedEntryTag) {
          changedEntryTags.push(deletedEntryTag);
        }
      }

      if (changedEntryTags.length > 0) {
        await this.stageEntryTags(trx, changedEntryTags);
      }
    });
  }

  async setSticker(input: SetStickerInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const entrySticker = await this.repositories.entryStickers.upsertEntrySticker(trx, {
        entryId: input.entryId,
        slot: input.slot,
        stickerId: input.stickerId,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageEntryStickers(trx, [entrySticker]);
    });
  }

  async clearSticker(input: ClearStickerInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const deletedEntrySticker = await this.repositories.entryStickers.deleteEntrySticker(trx, {
        entryId: input.entryId,
        slot: input.slot,
        deletedAt: now,
      });

      if (deletedEntrySticker) {
        await this.stageEntryStickers(trx, [deletedEntrySticker]);
      }
    });
  }

  private stageEntryTags(trx: Executor, entryTags: EntryTag[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryTags,
      entryTags.map(entryTag => ({
        id: toEntryTagEntityId(entryTag.entryId, entryTag.tagId),
        data: this.repositories.entryTags.toSyncData(entryTag),
      }))
    );
  }

  private stageEntryStickers(trx: Executor, entryStickers: EntrySticker[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryStickers,
      entryStickers.map(entrySticker => ({
        id: toEntryStickerEntityId(entrySticker.entryId, entrySticker.slot),
        data: this.repositories.entryStickers.toSyncData(entrySticker),
      }))
    );
  }
}
