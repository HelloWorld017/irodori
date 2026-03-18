import { toEntryStickerEntityId } from '@/repositories/EntryStickersRepository';
import { toEntryTagEntityId } from '@/repositories/EntryTagsRepository';
import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { EntryDraftSticker } from '@/repositories/EntryDraftsRepository';
import type { EntrySticker } from '@/repositories/EntryStickersRepository';
import type { EntryTag } from '@/repositories/EntryTagsRepository';
import type { StickerViewItem } from '@/repositories/StickersRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';

type PublishDraftInput = {
  entryId: string;
  tagIds: string[];
  stickers: EntryDraftSticker[];
  now: number;
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

  async publishDraft(trx: Executor, input: PublishDraftInput): Promise<void> {
    await this.publishTags(trx, input.entryId, input.tagIds, input.now);
    await this.publishStickers(trx, input.entryId, input.stickers, input.now);
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

  private async publishTags(
    trx: Executor,
    entryId: string,
    tagIds: string[],
    now: number
  ): Promise<void> {
    const nextTagIds = toUniqueValues(tagIds);
    const currentEntryTags = await this.repositories.entryTags.listEntryTagsByEntryId(entryId, trx);
    const currentTagIds = new Set(currentEntryTags.map(entryTag => entryTag.tagId));
    const nextTagIdSet = new Set(nextTagIds);
    const changedEntryTags: EntryTag[] = [];

    for (const tagId of nextTagIds) {
      if (currentTagIds.has(tagId)) {
        continue;
      }

      const entryTag = await this.repositories.entryTags.upsertEntryTag(trx, {
        entryId,
        tagId,
        createdAt: now,
        updatedAt: now,
      });

      changedEntryTags.push(entryTag);
    }

    for (const entryTag of currentEntryTags) {
      if (nextTagIdSet.has(entryTag.tagId)) {
        continue;
      }

      const deletedEntryTag = await this.repositories.entryTags.deleteEntryTag(trx, {
        entryId,
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
  }

  private async publishStickers(
    trx: Executor,
    entryId: string,
    stickers: EntryDraftSticker[],
    now: number
  ): Promise<void> {
    const currentEntryStickers = await this.repositories.entryStickers.listEntryStickersByEntryId(
      entryId,
      trx
    );
    const currentEntryStickersBySlot = new Map(
      currentEntryStickers.map(entrySticker => [entrySticker.slot, entrySticker])
    );
    const changedEntryStickers: EntrySticker[] = [];

    for (const draftSticker of stickers) {
      const currentEntrySticker = currentEntryStickersBySlot.get(draftSticker.slot);

      if (currentEntrySticker?.stickerId === draftSticker.stickerId) {
        currentEntryStickersBySlot.delete(draftSticker.slot);
        continue;
      }

      const nextEntrySticker = await this.repositories.entryStickers.upsertEntrySticker(trx, {
        entryId,
        slot: draftSticker.slot,
        stickerId: draftSticker.stickerId,
        createdAt: currentEntrySticker?.createdAt ?? now,
        updatedAt: now,
      });

      changedEntryStickers.push(nextEntrySticker);
      currentEntryStickersBySlot.delete(draftSticker.slot);
    }

    for (const entrySticker of currentEntryStickersBySlot.values()) {
      const deletedEntrySticker = await this.repositories.entryStickers.deleteEntrySticker(trx, {
        entryId,
        slot: entrySticker.slot,
        deletedAt: now,
      });

      if (deletedEntrySticker) {
        changedEntryStickers.push(deletedEntrySticker);
      }
    }

    if (changedEntryStickers.length > 0) {
      await this.stageEntryStickers(trx, changedEntryStickers);
    }
  }
}
