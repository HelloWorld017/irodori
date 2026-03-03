import { sql } from 'kysely';
import { z } from 'zod';
import { buildSingleFieldCursorWhere } from '@/utils/cursor';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { CursorPageInput, CursorPageResult, SingleFieldCursor } from '@/types/Cursor';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type EntriesTable = {
  id: string;
  notebook_id: string;
  title: string;
  body_md: string;
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
  bodyMd: string;
  coverAssetId: string | null;
  index: number;
  date: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type EntrySummary = Omit<Entry, 'bodyMd'>;
export type EntryListCursor = SingleFieldCursor<'entry_index', number>;

export type ListEntrySummariesInput = CursorPageInput<EntryListCursor> & {
  notebookId: string;
  searchText?: string;
  tagIds?: string[];
};

export type EntrySyncData = {
  notebookId: string;
  title: string;
  bodyMd: string;
  coverAssetId: string | null;
  index: number;
  date: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateEntryInput = {
  id: string;
  notebookId: string;
  title: string;
  bodyMd: string;
  coverAssetId: string | null;
  date: number;
  createdAt: number;
  updatedAt: number;
};

export type UpdateEntryInput = {
  id: string;
  title: string;
  bodyMd: string;
  coverAssetId: string | null;
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
  bodyMd: row.body_md,
  coverAssetId: row.cover_asset_id,
  index: row.entry_index,
  date: row.entry_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntrySummary = (
  row: Pick<
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
  >
): EntrySummary => ({
  id: row.id,
  notebookId: row.notebook_id,
  title: row.title,
  coverAssetId: row.cover_asset_id,
  index: row.entry_index,
  date: row.entry_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntrySyncData = (entry: Entry): EntrySyncData => ({
  notebookId: entry.notebookId,
  title: entry.title,
  bodyMd: entry.bodyMd,
  coverAssetId: entry.coverAssetId,
  index: entry.index,
  date: entry.date,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  deletedAt: entry.deletedAt,
});

const entrySyncDataSchema: z.ZodType<EntrySyncData> = z.object({
  notebookId: z.string(),
  title: z.string(),
  bodyMd: z.string(),
  coverAssetId: z.string().nullable(),
  index: z.number(),
  date: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
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

export class EntriesRepository implements SyncedRepository<EntrySyncData, Executor>, Repository {
  readonly syncNamespace = 'entry';
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT NOT NULL,
        notebook_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body_md TEXT NOT NULL DEFAULT '',
        cover_asset_id TEXT,
        entry_index INTEGER NOT NULL,
        entry_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_notebook_id_idx
      ON entries (notebook_id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_updated_at_idx
      ON entries (updated_at)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_notebook_id_entry_index_id_idx
      ON entries (notebook_id, entry_index, id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_deleted_at_idx
      ON entries (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

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

  async listEntrySummaries(
    input: ListEntrySummariesInput
  ): Promise<CursorPageResult<EntrySummary, EntryListCursor>> {
    const pageSize = Math.max(1, Math.min(input.limit ?? 30, 100));
    const cursorWhere = buildSingleFieldCursorWhere(input.cursor, 'entry_index', 'desc');
    const searchText = normalizeSearchText(input.searchText);
    const tagIds = normalizeTagIds(input.tagIds);

    let query = this.db
      .selectFrom('entries')
      .select([
        'id',
        'notebook_id',
        'title',
        'cover_asset_id',
        'entry_index',
        'entry_date',
        'created_at',
        'updated_at',
        'deleted_at',
      ])
      .where('notebook_id', '=', input.notebookId)
      .where('deleted_at', 'is', null)
      .orderBy('entry_index', 'desc')
      .orderBy('id', 'desc');

    if (searchText) {
      const searchPattern = `%${searchText}%`;

      query = query.where(eb =>
        eb.or([eb('title', 'like', searchPattern), eb('body_md', 'like', searchPattern)])
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

    if (cursorWhere) {
      query = query.where(cursorWhere);
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

  async readEntryById(id: string): Promise<Entry | null> {
    const row = await this.db
      .selectFrom('entries')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toEntry(row) : null;
  }

  async createEntry(executor: Executor, input: CreateEntryInput): Promise<Entry> {
    const indexRow = await executor
      .selectFrom('entries')
      .select(sql<number>`coalesce(max(entry_index), -1)`.as('maxEntryIndex'))
      .where('notebook_id', '=', input.notebookId)
      .executeTakeFirstOrThrow();

    const entry: Entry = {
      id: input.id,
      notebookId: input.notebookId,
      title: input.title,
      bodyMd: input.bodyMd,
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
        body_md: entry.bodyMd,
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
        body_md: input.bodyMd,
        cover_asset_id: input.coverAssetId,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntry(currentRow),
      title: input.title,
      bodyMd: input.bodyMd,
      coverAssetId: input.coverAssetId,
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
          body_md: data.bodyMd,
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
            body_md: data.bodyMd,
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
