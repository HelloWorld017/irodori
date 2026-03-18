import type { Services } from '.';
import type { EntryDetailItem } from './EntriesService';
import type { Executor, Repositories } from '@/repositories';
import type { Entry } from '@/repositories/EntriesRepository';
import type { EntryAssetUsage } from '@/repositories/EntryAssetsRepository';
import type {
  EntryDraft,
  EntryDraftCover,
  EntryDraftData,
  EntryDraftSticker,
} from '@/repositories/EntryDraftsRepository';

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
      await this.services.entryMetadata.publishDraft(trx, {
        entryId: input.entryId,
        tagIds: data.tagIds,
        stickers: data.stickers,
        now,
      });
      await this.services.entryAssets.publishDraft(trx, {
        entryId: input.entryId,
        assets,
        now,
      });

      const deletedDraft = await this.repositories.entryDrafts.deleteEntryDraft(trx, {
        entryId: input.entryId,
        deletedAt: now,
      });

      if (deletedDraft) {
        await this.stageEntryDraft(trx, deletedDraft);
      }
    });
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
}
