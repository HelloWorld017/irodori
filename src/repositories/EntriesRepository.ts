import { sql } from 'kysely';
import { VERSION } from '@/constants/database';
import { entrySyncDataSchema } from './_schema/EntriesSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { Asset } from './AssetsRepository';
import type { EntrySyncData } from './_schema/EntriesSchema';
import type { CursorPageInput, CursorPageResult, SingleFieldCursor } from '@/types/Cursor';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { EntrySyncData } from './_schema/EntriesSchema';

export type EntriesTable = {
  id: string;
  notebook_id: string;
  title: string;
  body: string;
  cover_asset_id: string | null;
  entry_index: number;
  entry_date: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntriesDatabase = {
  entries: EntriesTable;
};

export type Entry = {
  id: string;
  notebookId: string;
  title: string;
  body: string;
  coverAssetId: string | null;
  index: number;
  date: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type EntryCoverAsset = Pick<Asset, 'blobDigest' | 'blurhash' | 'mime' | 'width' | 'height'>;

export type EntryWithCoverAsset = Entry & {
  coverAsset: EntryCoverAsset | null;
};

export type EntrySummary = Omit<EntryWithCoverAsset, 'body'>;
export type EntryListCursor = SingleFieldCursor<'entry_index', number>;

export type ListEntrySummariesInput = CursorPageInput<EntryListCursor> & {
  notebookId: string;
  searchText?: string;
  tagIds?: string[];
};

type EntryCoverAssetColumns = {
  coverAssetBlobDigest: string | null;
  coverAssetBlurhash: string | null;
  coverAssetMime: string | null;
  coverAssetWidth: number | null;
  coverAssetHeight: number | null;
};

type EntrySummaryRow = Pick<
  Selectable<EntriesTable>,
  | 'id'
  | 'notebook_id'
  | 'title'
  | 'cover_asset_id'
  | 'entry_index'
  | 'entry_date'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
> &
  EntryCoverAssetColumns;

type EntryWithCoverAssetRow = Selectable<EntriesTable> & EntryCoverAssetColumns;

export type CreateEntryInput = {
  id: string;
  notebookId: string;
  title: string;
  body: string;
  coverAssetId: string | null;
  date: number;
  createdAt: number;
  updatedAt: number;
};

export type UpdateEntryInput = {
  id: string;
  title: string;
  body: string;
  coverAssetId: string | null;
  date: number;
  updatedAt: number;
};

export type DeleteEntryInput = {
  id: string;
  deletedAt: number;
};

const toEntry = (row: Selectable<EntriesTable>): Entry => ({
  id: row.id,
  notebookId: row.notebook_id,
  title: row.title,
  body: row.body,
  coverAssetId: row.cover_asset_id,
  index: row.entry_index,
  date: row.entry_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toCoverAsset = (row: EntryCoverAssetColumns): EntryCoverAsset | null => {
  if (row.coverAssetBlobDigest === null || row.coverAssetMime === null) {
    return null;
  }

  return {
    blobDigest: row.coverAssetBlobDigest,
    blurhash: row.coverAssetBlurhash,
    mime: row.coverAssetMime,
    width: row.coverAssetWidth,
    height: row.coverAssetHeight,
  };
};

const toEntrySummary = (row: EntrySummaryRow): EntrySummary => ({
  id: row.id,
  notebookId: row.notebook_id,
  title: row.title,
  coverAssetId: row.cover_asset_id,
  coverAsset: toCoverAsset(row),
  index: row.entry_index,
  date: row.entry_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryWithCoverAsset = (row: EntryWithCoverAssetRow): EntryWithCoverAsset => ({
  ...toEntry(row),
  coverAsset: toCoverAsset(row),
});

const toEntrySyncData = (entry: Entry): EntrySyncData => ({
  version: VERSION,
  notebookId: entry.notebookId,
  title: entry.title,
  body: entry.body,
  coverAssetId: entry.coverAssetId,
  index: entry.index,
  date: entry.date,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  deletedAt: entry.deletedAt,
});

const parseEntrySyncData = (id: string, data: unknown): EntrySyncData =>
  parseSyncDataOrThrow(entrySyncDataSchema, 'entry', id, data);

const normalizeSearchText = (value: string | undefined): string | null => {
  const searchText = value?.trim();

  return searchText ? searchText : null;
};

const normalizeTagIds = (tagIds: string[] | undefined): string[] => {
  if (!tagIds) {
    return [];
  }

  return [...new Set(tagIds.map(tagId => tagId.trim()).filter(tagId => tagId.length > 0))];
};

const coverAssetSelect = [
  'assets.blob_digest as coverAssetBlobDigest',
  'assets.blurhash as coverAssetBlurhash',
  'assets.mime as coverAssetMime',
  'assets.width as coverAssetWidth',
  'assets.height as coverAssetHeight',
] as const;

export class EntriesRepository implements SyncedRepository<EntrySyncData, Executor>, Repository {
  readonly syncNamespace = 'entry';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listEntriesByNotebookId(notebookId: string): Promise<Entry[]> {
    const rows = await this.db
      .selectFrom('entries')
      .selectAll()
      .where('notebook_id', '=', notebookId)
      .where('deleted_at', 'is', null)
      .orderBy('entry_index', 'desc')
      .orderBy('id', 'desc')
      .execute();

    return rows.map(toEntry);
  }

  async countEntriesByNotebookId(notebookId: string): Promise<number> {
    const row = await this.db
      .selectFrom('entries')
      .select(sql<number>`count(*)`.as('entryCount'))
      .where('notebook_id', '=', notebookId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return Number(row?.entryCount ?? 0);
  }

  async listEntrySummaries(
    input: ListEntrySummariesInput
  ): Promise<CursorPageResult<EntrySummary, EntryListCursor>> {
    const pageSize = Math.max(1, Math.min(input.limit ?? 30, 100));
    const searchText = normalizeSearchText(input.searchText);
    const tagIds = normalizeTagIds(input.tagIds);

    let query = this.db
      .selectFrom('entries')
      .leftJoin('assets', join =>
        join.onRef('assets.id', '=', 'entries.cover_asset_id').on('assets.deleted_at', 'is', null)
      )
      .select([
        'entries.id as id',
        'entries.notebook_id as notebook_id',
        'entries.title as title',
        'entries.cover_asset_id as cover_asset_id',
        'entries.entry_index as entry_index',
        'entries.entry_date as entry_date',
        'entries.created_at as created_at',
        'entries.updated_at as updated_at',
        'entries.deleted_at as deleted_at',
        ...coverAssetSelect,
      ])
      .where('entries.notebook_id', '=', input.notebookId)
      .where('entries.deleted_at', 'is', null)
      .orderBy('entries.entry_index', 'desc')
      .orderBy('entries.id', 'desc');

    if (searchText) {
      const searchPattern = `%${searchText}%`;

      query = query.where(eb =>
        eb.or([
          eb('entries.title', 'like', searchPattern),
          eb('entries.body', 'like', searchPattern),
        ])
      );
    }

    for (const tagId of tagIds) {
      query = query.where(eb =>
        eb.exists(
          eb
            .selectFrom('entry_tags')
            .select('entry_tags.entry_id')
            .whereRef('entry_tags.entry_id', '=', 'entries.id')
            .where('entry_tags.tag_id', '=', tagId)
            .where('entry_tags.deleted_at', 'is', null)
        )
      );
    }

    if (input.cursor) {
      const cursor = input.cursor;

      query = query.where(eb =>
        eb.or([
          eb('entries.entry_index', '<', cursor.entry_index),
          eb.and([
            eb('entries.entry_index', '=', cursor.entry_index),
            eb('entries.id', '<', cursor.id),
          ]),
        ])
      );
    }

    const rows = await query.limit(pageSize + 1).execute();
    const hasNextPage = rows.length > pageSize;
    const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;
    const lastRow = pageRows.at(-1);

    return {
      items: pageRows.map(toEntrySummary),
      nextCursor:
        hasNextPage && lastRow
          ? {
              entry_index: lastRow.entry_index,
              id: lastRow.id,
            }
          : null,
    };
  }

  async readEntryById(id: string): Promise<EntryWithCoverAsset | null> {
    const row = await this.db
      .selectFrom('entries')
      .leftJoin('assets', join =>
        join.onRef('assets.id', '=', 'entries.cover_asset_id').on('assets.deleted_at', 'is', null)
      )
      .selectAll('entries')
      .select(coverAssetSelect)
      .where('entries.id', '=', id)
      .where('entries.deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toEntryWithCoverAsset(row) : null;
  }

  async createEntry(executor: Executor, input: CreateEntryInput): Promise<Entry> {
    const indexRow = await executor
      .selectFrom('entries')
      .select(sql<number>`coalesce(max(entry_index), 0)`.as('maxEntryIndex'))
      .where('notebook_id', '=', input.notebookId)
      .executeTakeFirstOrThrow();

    const entry: Entry = {
      id: input.id,
      notebookId: input.notebookId,
      title: input.title,
      body: input.body,
      coverAssetId: input.coverAssetId,
      index: indexRow.maxEntryIndex + 1,
      date: input.date,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entries')
      .values({
        id: entry.id,
        notebook_id: entry.notebookId,
        title: entry.title,
        body: entry.body,
        cover_asset_id: entry.coverAssetId,
        entry_index: entry.index,
        entry_date: entry.date,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
        deleted_at: entry.deletedAt,
      })
      .execute();

    return entry;
  }

  async updateEntry(executor: Executor, input: UpdateEntryInput): Promise<Entry | null> {
    const currentRow = await executor
      .selectFrom('entries')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entries')
      .set({
        title: input.title,
        body: input.body,
        cover_asset_id: input.coverAssetId,
        entry_date: input.date,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntry(currentRow),
      title: input.title,
      body: input.body,
      coverAssetId: input.coverAssetId,
      date: input.date,
      updatedAt: input.updatedAt,
    };
  }

  async deleteEntry(executor: Executor, input: DeleteEntryInput): Promise<Entry | null> {
    const currentRow = await executor
      .selectFrom('entries')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entries')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntry(currentRow),
      deletedAt: input.deletedAt,
      updatedAt: input.deletedAt,
    };
  }

  toSyncData(entry: Entry): EntrySyncData {
    return toEntrySyncData(entry);
  }

  async upsertBySync(executor: Executor, docs: SyncUpsertPayload<EntrySyncData>[]): Promise<void> {
    for (const doc of docs) {
      const data = parseEntrySyncData(doc.id, doc.data);

      await executor
        .insertInto('entries')
        .values({
          id: doc.id,
          notebook_id: data.notebookId,
          title: data.title,
          body: data.body,
          cover_asset_id: data.coverAssetId,
          entry_index: data.index,
          entry_date: data.date,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            notebook_id: data.notebookId,
            title: data.title,
            body: data.body,
            cover_asset_id: data.coverAssetId,
            entry_index: data.index,
            entry_date: data.date,
            created_at: data.createdAt,
            updated_at: data.updatedAt,
            deleted_at: data.deletedAt,
          })
        )
        .execute();
    }
  }

  async deleteBySync(executor: Executor, docs: SyncDeletePayload[]): Promise<void> {
    const deletedAt = Date.now();

    for (const doc of docs) {
      await executor
        .updateTable('entries')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
