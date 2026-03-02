import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Entry, EntryListCursor, EntrySummary } from '@/repositories/EntriesRepository';
import type { Sticker } from '@/repositories/StickersRepository';
import type { Tag } from '@/repositories/TagsRepository';
import type { CursorPageInput, CursorPageResult } from '@/types/Cursor';

type ListByNotebookIdInput = CursorPageInput<EntryListCursor> & {
  notebookId: string;
};

type CreateEntryInput = {
  notebookId: string;
  title: string;
  bodyMd?: string;
  coverAssetId?: string | null;
  date?: number;
};

type UpdateEntryInput = {
  id: string;
  title: string;
  bodyMd: string;
  coverAssetId: string | null;
};

type RemoveEntryInput = {
  id: string;
};

export type EntryListSticker = {
  slot: number;
  sticker: Sticker;
};

export type EntryListItem = EntrySummary & {
  tags: Tag[];
  stickers: EntryListSticker[];
};

const normalizeEntryTitle = (value: string): string => {
  const title = value.trim();

  if (!title) {
    throw new Error('Entry title is required.');
  }

  return title;
};

const assertEntryExists = (entry: Entry | null, id: string): Entry => {
  if (!entry) {
    throw new Error(`Entry not found: id=${id}`);
  }

  return entry;
};

const toUniqueValues = <T>(values: T[]): T[] => [...new Set(values)];

export class EntriesService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  async listByNotebookId(
    input: ListByNotebookIdInput
  ): Promise<CursorPageResult<EntryListItem, EntryListCursor>> {
    const { items: entrySummaries, nextCursor } =
      await this.repositories.entries.listEntrySummariesByNotebookId(input);

    if (entrySummaries.length === 0) {
      return {
        items: [],
        nextCursor,
      };
    }

    const entryIds = entrySummaries.map(entry => entry.id);
    const [entryTags, entryStickers] = await Promise.all([
      this.repositories.entryTags.listEntryTagsByEntryIds(entryIds),
      this.repositories.entryStickers.listEntryStickersByEntryIds(entryIds),
    ]);

    const tagIds = toUniqueValues(entryTags.map(entryTag => entryTag.tagId));
    const stickerIds = toUniqueValues(entryStickers.map(entrySticker => entrySticker.stickerId));

    const [tags, stickers] = await Promise.all([
      this.repositories.tags.listTagsByIds(tagIds),
      this.repositories.stickers.listStickersByIds(stickerIds),
    ]);

    const tagsById = new Map(tags.map(tag => [tag.id, tag]));
    const stickersById = new Map(stickers.map(sticker => [sticker.id, sticker]));

    const entryTagsByEntryId = new Map<string, Tag[]>();
    entryTags.forEach(entryTag => {
      const tag = tagsById.get(entryTag.tagId);
      if (!tag) {
        return;
      }

      const currentTags = entryTagsByEntryId.get(entryTag.entryId) ?? [];
      currentTags.push(tag);
      entryTagsByEntryId.set(entryTag.entryId, currentTags);
    });

    const entryStickersByEntryId = new Map<string, EntryListSticker[]>();
    entryStickers.forEach(entrySticker => {
      const sticker = stickersById.get(entrySticker.stickerId);
      if (!sticker) {
        return;
      }

      const currentStickers = entryStickersByEntryId.get(entrySticker.entryId) ?? [];
      currentStickers.push({ slot: entrySticker.slot, sticker });
      entryStickersByEntryId.set(entrySticker.entryId, currentStickers);
    });

    return {
      items: entrySummaries.map(summary => ({
        ...summary,
        tags: entryTagsByEntryId.get(summary.id) ?? [],
        stickers: entryStickersByEntryId.get(summary.id) ?? [],
      })),
      nextCursor,
    };
  }

  getById(id: string): Promise<Entry | null> {
    return this.repositories.entries.readEntryById(id);
  }

  async create(input: CreateEntryInput): Promise<Entry> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const title = normalizeEntryTitle(input.title);
    const bodyMd = input.bodyMd ?? '';
    const coverAssetId = input.coverAssetId ?? null;
    const date = input.date ?? now;

    return this.repositories.withTransaction(async trx => {
      const entry = await this.repositories.entries.createEntry(trx, {
        id,
        notebookId: input.notebookId,
        title,
        bodyMd,
        coverAssetId,
        date,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageEntry(trx, entry);
      return entry;
    });
  }

  async update(input: UpdateEntryInput): Promise<Entry> {
    const now = Date.now();
    const title = normalizeEntryTitle(input.title);

    return this.repositories.withTransaction(async trx => {
      const entry = assertEntryExists(
        await this.repositories.entries.updateEntry(trx, {
          id: input.id,
          title,
          bodyMd: input.bodyMd,
          coverAssetId: input.coverAssetId,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageEntry(trx, entry);
      return entry;
    });
  }

  async remove(input: RemoveEntryInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const entry = assertEntryExists(
        await this.repositories.entries.deleteEntry(trx, {
          id: input.id,
          deletedAt: now,
        }),
        input.id
      );

      await this.stageEntry(trx, entry);
    });
  }

  private stageEntry(trx: Executor, entry: Entry): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.entries, [
      { id: entry.id, data: this.repositories.entries.toSyncData(entry) },
    ]);
  }
}
