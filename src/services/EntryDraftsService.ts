import { toEntryAssetEntityId } from '@/repositories/EntryAssetsRepository';
import { toEntryStickerEntityId } from '@/repositories/EntryStickersRepository';
import { toEntryTagEntityId } from '@/repositories/EntryTagsRepository';
import type { Services } from '.';
import type { EntryDetailItem } from './EntriesService';
import type { Executor, Repositories } from '@/repositories';
import type { Entry } from '@/repositories/EntriesRepository';
import type { EntryAsset, EntryAssetUsage } from '@/repositories/EntryAssetsRepository';
import type {
  EntryDraft,
  EntryDraftCover,
  EntryDraftData,
  EntryDraftSticker,
} from '@/repositories/EntryDraftsRepository';
import type { EntrySticker } from '@/repositories/EntryStickersRepository';
import type { EntryTag } from '@/repositories/EntryTagsRepository';

const MAX_ENTRY_STICKER_SLOT = 3;

export type EntryDraftPublishAsset = {
  assetId: string;
  usage: EntryAssetUsage;
};

const toUniquePublishAssets = (assets: EntryDraftPublishAsset[]): EntryDraftPublishAsset[] =>
  Array.from(
    new Map(assets.map(asset => [`${asset.usage}:${asset.assetId}`, asset] as const)).values()
  );

const normalizeDraftCover = (cover: EntryDraftCover | null): EntryDraftCover | null => {
  if (!cover) {
    return null;
  }

  return {
    ...cover,
    id: cover.id.trim(),
    blobDigest: cover.blobDigest.trim(),
    mime: cover.mime.trim(),
  };
};

const normalizeDraftSticker = (sticker: EntryDraftSticker): EntryDraftSticker | null => {
  if (
    !Number.isInteger(sticker.slot) ||
    sticker.slot < 1 ||
    sticker.slot > MAX_ENTRY_STICKER_SLOT
  ) {
    return null;
  }

  const stickerId = sticker.stickerId.trim();
  if (!stickerId) {
    return null;
  }

  return {
    slot: sticker.slot,
    stickerId,
  };
};

const toUniqueTagIds = (tagIds: string[]): string[] => {
  const normalizedTagIds = new Set<string>();

  tagIds.forEach(tagId => {
    const normalizedTagId = tagId.trim();

    if (!normalizedTagId) {
      return;
    }

    normalizedTagIds.add(normalizedTagId);
  });

  return [...normalizedTagIds];
};

const toUniqueStickers = (stickers: EntryDraftSticker[]): EntryDraftSticker[] => {
  const stickersBySlot = new Map<number, EntryDraftSticker>();

  stickers.forEach(sticker => {
    const normalizedSticker = normalizeDraftSticker(sticker);

    if (!normalizedSticker) {
      return;
    }

    stickersBySlot.set(normalizedSticker.slot, normalizedSticker);
  });

  return [...stickersBySlot.values()].sort((left, right) => left.slot - right.slot);
};

const normalizeDraftDate = (date: number): number => (Number.isFinite(date) ? date : Date.now());

const toPublishedTitle = (value: string): string => {
  const title = value.trim();

  if (!title) {
    throw new Error('Entry title is required.');
  }

  return title;
};

export const normalizeEntryDraftData = (data: EntryDraftData): EntryDraftData => ({
  title: data.title,
  body: data.body,
  date: normalizeDraftDate(data.date),
  cover: normalizeDraftCover(data.cover),
  tagIds: toUniqueTagIds(data.tagIds),
  stickers: toUniqueStickers(data.stickers),
  excludedTagIds: toUniqueTagIds(data.excludedTagIds),
});

export const toEntryDraftData = (entry: EntryDetailItem): EntryDraftData =>
  normalizeEntryDraftData({
    title: entry.title,
    body: entry.body,
    date: entry.date,
    cover:
      entry.coverAsset && entry.coverAssetId
        ? {
            id: entry.coverAssetId,
            ...entry.coverAsset,
          }
        : null,
    tagIds: entry.tags.map(tag => tag.id),
    stickers: entry.stickers.map(({ slot, sticker }) => ({
      slot,
      stickerId: sticker.id,
    })),
    excludedTagIds: [],
  });

const assertEntryExists = (entry: Entry | null, id: string): Entry => {
  if (!entry) {
    throw new Error(`Entry not found: id=${id}`);
  }

  return entry;
};

export class EntryDraftsService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  getByEntryId(entryId: string): Promise<EntryDraft | null> {
    return this.repositories.entryDrafts.readEntryDraftByEntryId(entryId);
  }

  async save(input: { entryId: string; data: EntryDraftData }): Promise<EntryDraft> {
    const now = Date.now();
    const data = normalizeEntryDraftData(input.data);

    return this.repositories.withTransaction(async trx => {
      const entryDraft = await this.repositories.entryDrafts.upsertEntryDraft(trx, {
        entryId: input.entryId,
        data,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageEntryDraft(trx, entryDraft);
      return entryDraft;
    });
  }

  async clear(input: { entryId: string }): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const entryDraft = await this.repositories.entryDrafts.deleteEntryDraft(trx, {
        entryId: input.entryId,
        deletedAt: now,
      });

      if (!entryDraft) {
        return;
      }

      await this.stageEntryDraft(trx, entryDraft);
    });
  }

  async publish(input: {
    entryId: string;
    data: EntryDraftData;
    assets: EntryDraftPublishAsset[];
  }): Promise<void> {
    const now = Date.now();
    const data = normalizeEntryDraftData(input.data);
    const assets = toUniquePublishAssets(input.assets);
    const title = toPublishedTitle(data.title);

    await this.repositories.withTransaction(async trx => {
      const entry = assertEntryExists(
        await this.repositories.entries.updateEntry(trx, {
          id: input.entryId,
          title,
          body: data.body,
          coverAssetId: data.cover?.id ?? null,
          date: data.date,
          updatedAt: now,
        }),
        input.entryId
      );

      await this.stageEntry(trx, entry);
      await this.publishTags(trx, input.entryId, data.tagIds, now);
      await this.publishStickers(trx, input.entryId, data.stickers, now);
      await this.publishAssets(trx, input.entryId, assets, now);

      const deletedDraft = await this.repositories.entryDrafts.deleteEntryDraft(trx, {
        entryId: input.entryId,
        deletedAt: now,
      });

      if (deletedDraft) {
        await this.stageEntryDraft(trx, deletedDraft);
      }
    });
  }

  private async publishTags(
    trx: Executor,
    entryId: string,
    tagIds: string[],
    now: number
  ): Promise<void> {
    const currentEntryTags = await this.repositories.entryTags.listEntryTagsByEntryId(entryId, trx);
    const currentTagIds = new Set(currentEntryTags.map(entryTag => entryTag.tagId));
    const nextTagIdSet = new Set(tagIds);
    const changedEntryTags: EntryTag[] = [];

    for (const tagId of tagIds) {
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

  private async publishAssets(
    trx: Executor,
    entryId: string,
    assets: EntryDraftPublishAsset[],
    now: number
  ): Promise<void> {
    const currentEntryAssets = await this.repositories.entryAssets.listEntryAssetsByEntryId(
      entryId,
      {
        executor: trx,
      }
    );
    const currentEntryAssetsByIdentity = new Map(
      currentEntryAssets.map(
        entryAsset => [toEntryAssetIdentityKey(entryAsset), entryAsset] as const
      )
    );
    const nextAssetIdentitySet = new Set(assets.map(toEntryAssetIdentityKey));
    const changedEntryAssets: EntryAsset[] = [];

    for (const asset of assets) {
      const currentEntryAsset = currentEntryAssetsByIdentity.get(toEntryAssetIdentityKey(asset));
      if (currentEntryAsset) {
        continue;
      }

      const nextEntryAsset = await this.repositories.entryAssets.upsertEntryAsset(trx, {
        entryId,
        assetId: asset.assetId,
        usage: asset.usage,
        createdAt: now,
        updatedAt: now,
      });

      changedEntryAssets.push(nextEntryAsset);
    }

    for (const currentEntryAsset of currentEntryAssets) {
      const identityKey = toEntryAssetIdentityKey(currentEntryAsset);

      if (nextAssetIdentitySet.has(identityKey)) {
        continue;
      }

      const deletedEntryAsset = await this.repositories.entryAssets.deleteEntryAsset(trx, {
        entryId,
        assetId: currentEntryAsset.assetId,
        usage: currentEntryAsset.usage,
        deletedAt: now,
      });

      if (deletedEntryAsset) {
        changedEntryAssets.push(deletedEntryAsset);
      }
    }

    if (changedEntryAssets.length > 0) {
      await this.stageEntryAssets(trx, changedEntryAssets);
    }
  }

  private stageEntry(trx: Executor, entry: Entry): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.entries, [
      { id: entry.id, data: this.repositories.entries.toSyncData(entry) },
    ]);
  }

  private stageEntryDraft(trx: Executor, entryDraft: EntryDraft): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.entryDrafts, [
      { id: entryDraft.entryId, data: this.repositories.entryDrafts.toSyncData(entryDraft) },
    ]);
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

  private stageEntryAssets(trx: Executor, entryAssets: EntryAsset[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryAssets,
      entryAssets.map(entryAsset => ({
        id: toEntryAssetEntityId(entryAsset.entryId, entryAsset.assetId, entryAsset.usage),
        data: this.repositories.entryAssets.toSyncData(entryAsset),
      }))
    );
  }
}
