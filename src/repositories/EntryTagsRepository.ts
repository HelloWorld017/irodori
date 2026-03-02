import { sql } from 'kysely';
import { z } from 'zod';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

const ENTRY_TAG_SEPARATOR = ':';

type EntryTagIdentity = {
  entryId: string;
  tagId: string;
};

export const toEntryTagEntityId = (entryId: string, tagId: string): string =>
  `${entryId}${ENTRY_TAG_SEPARATOR}${tagId}`;

const parseEntryTagEntityId = (id: string): EntryTagIdentity => {
  const separatorIndex = id.indexOf(ENTRY_TAG_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex === id.length - 1) {
    throw new Error(`Invalid entry tag id: ${id}`);
  }

  return {
    entryId: id.slice(0, separatorIndex),
    tagId: id.slice(separatorIndex + 1),
  };
};

export type EntryTagsTable = {
  entry_id: string;
  tag_id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntryTagsDatabase = {
  entry_tags: EntryTagsTable;
};

export type EntryTag = {
  entryId: string;
  tagId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type EntryTagSyncData = {
  entryId: string;
  tagId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type UpsertEntryTagInput = {
  entryId: string;
  tagId: string;
  createdAt: number;
  updatedAt: number;
};

export type DeleteEntryTagInput = {
  entryId: string;
  tagId: string;
  deletedAt: number;
};

const toEntryTag = (row: Selectable<EntryTagsTable>): EntryTag => ({
  entryId: row.entry_id,
  tagId: row.tag_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryTagSyncData = (entryTag: EntryTag): EntryTagSyncData => ({
  entryId: entryTag.entryId,
  tagId: entryTag.tagId,
  createdAt: entryTag.createdAt,
  updatedAt: entryTag.updatedAt,
  deletedAt: entryTag.deletedAt,
});

const entryTagSyncDataSchema: z.ZodType<EntryTagSyncData> = z.object({
  entryId: z.string(),
  tagId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const parseEntryTagSyncData = (id: string, data: unknown): EntryTagSyncData =>
  parseSyncDataOrThrow(entryTagSyncDataSchema, 'entry tag', id, data);

export class EntryTagsRepository
  implements SyncedRepository<EntryTagSyncData, Executor>, Repository
{
  readonly syncNamespace = 'entry-tag';
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id, tag_id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_tags_entry_id_idx
      ON entry_tags (entry_id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_tags_tag_id_idx
      ON entry_tags (tag_id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_tags_deleted_at_idx
      ON entry_tags (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async listEntryTagsByEntryId(entryId: string): Promise<EntryTag[]> {
    const rows = await this.db
      .selectFrom('entry_tags')
      .selectAll()
      .where('entry_id', '=', entryId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(toEntryTag);
  }

  async upsertEntryTag(executor: Executor, input: UpsertEntryTagInput): Promise<EntryTag> {
    const entryTag: EntryTag = {
      entryId: input.entryId,
      tagId: input.tagId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entry_tags')
      .values({
        entry_id: entryTag.entryId,
        tag_id: entryTag.tagId,
        created_at: entryTag.createdAt,
        updated_at: entryTag.updatedAt,
        deleted_at: entryTag.deletedAt,
      })
      .onConflict(conflict =>
        conflict.columns(['entry_id', 'tag_id']).doUpdateSet({
          created_at: entryTag.createdAt,
          updated_at: entryTag.updatedAt,
          deleted_at: null,
        })
      )
      .execute();

    return entryTag;
  }

  async deleteEntryTag(executor: Executor, input: DeleteEntryTagInput): Promise<EntryTag | null> {
    const currentRow = await executor
      .selectFrom('entry_tags')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .where('tag_id', '=', input.tagId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entry_tags')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('entry_id', '=', input.entryId)
      .where('tag_id', '=', input.tagId)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntryTag(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(entryTag: EntryTag): EntryTagSyncData {
    return toEntryTagSyncData(entryTag);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<EntryTagSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseEntryTagSyncData(doc.id, doc.data);

      await executor
        .insertInto('entry_tags')
        .values({
          entry_id: data.entryId,
          tag_id: data.tagId,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.columns(['entry_id', 'tag_id']).doUpdateSet({
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
      const entryTagIdentity = parseEntryTagEntityId(doc.id);

      await executor
        .updateTable('entry_tags')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('entry_id', '=', entryTagIdentity.entryId)
        .where('tag_id', '=', entryTagIdentity.tagId)
        .execute();
    }
  }
}
