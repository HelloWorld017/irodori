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

export type TagsTable = {
  id: string;
  category_id: string;
  label: string;
  color: string;
  icon: string | null;
  sort_order: number;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type TagsDatabase = {
  tags: TagsTable;
};

export type Tag = {
  id: string;
  categoryId: string;
  label: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TagSyncData = {
  categoryId: string;
  label: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateTagInput = {
  id: string;
  categoryId: string;
  label: string;
  color: string;
  icon: string | null;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type UpdateTagInput = {
  id: string;
  label: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  archivedAt: number | null;
  updatedAt: number;
};

export type DeleteTagInput = {
  id: string;
  deletedAt: number;
};

const toTag = (row: Selectable<TagsTable>): Tag => ({
  id: row.id,
  categoryId: row.category_id,
  label: row.label,
  color: row.color,
  icon: row.icon,
  sortOrder: row.sort_order,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toTagSyncData = (tag: Tag): TagSyncData => ({
  categoryId: tag.categoryId,
  label: tag.label,
  color: tag.color,
  icon: tag.icon,
  sortOrder: tag.sortOrder,
  archivedAt: tag.archivedAt,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
  deletedAt: tag.deletedAt,
});

const tagSyncDataSchema: z.ZodType<TagSyncData> = z.object({
  categoryId: z.string(),
  label: z.string(),
  color: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const parseTagSyncData = (id: string, data: unknown): TagSyncData =>
  parseSyncDataOrThrow(tagSyncDataSchema, 'tag', id, data);

export class TagsRepository implements SyncedRepository<TagSyncData, Executor>, Repository {
  readonly syncNamespace = 'tag';
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER NOT NULL,
        archived_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tags_category_id_idx
      ON tags (category_id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tags_sort_order_idx
      ON tags (sort_order)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tags_archived_at_idx
      ON tags (archived_at)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tags_deleted_at_idx
      ON tags (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async listTagsByCategoryId(
    categoryId: string,
    options?: { includeArchived?: boolean }
  ): Promise<Tag[]> {
    let query = this.db
      .selectFrom('tags')
      .selectAll()
      .where('category_id', '=', categoryId)
      .where('deleted_at', 'is', null);

    if (!options?.includeArchived) {
      query = query.where('archived_at', 'is', null);
    }

    const rows = await query.orderBy('sort_order', 'asc').orderBy('created_at', 'asc').execute();
    return rows.map(toTag);
  }

  async listTagsByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('tags')
      .selectAll()
      .where('id', 'in', ids)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(toTag);
  }

  async readTagById(id: string): Promise<Tag | null> {
    const row = await this.db
      .selectFrom('tags')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toTag(row) : null;
  }

  async createTag(executor: Executor, input: CreateTagInput): Promise<Tag> {
    const sortOrderRow = await executor
      .selectFrom('tags')
      .select(sql<number>`coalesce(max(sort_order), -1)`.as('maxSortOrder'))
      .where('category_id', '=', input.categoryId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    const tag: Tag = {
      id: input.id,
      categoryId: input.categoryId,
      label: input.label,
      color: input.color,
      icon: input.icon,
      sortOrder: sortOrderRow.maxSortOrder + 1,
      archivedAt: input.archivedAt,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('tags')
      .values({
        id: tag.id,
        category_id: tag.categoryId,
        label: tag.label,
        color: tag.color,
        icon: tag.icon,
        sort_order: tag.sortOrder,
        archived_at: tag.archivedAt,
        created_at: tag.createdAt,
        updated_at: tag.updatedAt,
        deleted_at: tag.deletedAt,
      })
      .execute();

    return tag;
  }

  async updateTag(executor: Executor, input: UpdateTagInput): Promise<Tag | null> {
    const currentRow = await executor
      .selectFrom('tags')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('tags')
      .set({
        label: input.label,
        color: input.color,
        icon: input.icon,
        sort_order: input.sortOrder,
        archived_at: input.archivedAt,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toTag(currentRow),
      label: input.label,
      color: input.color,
      icon: input.icon,
      sortOrder: input.sortOrder,
      archivedAt: input.archivedAt,
      updatedAt: input.updatedAt,
    };
  }

  async deleteTag(executor: Executor, input: DeleteTagInput): Promise<Tag | null> {
    const currentRow = await executor
      .selectFrom('tags')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('tags')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toTag(currentRow),
      deletedAt: input.deletedAt,
      updatedAt: input.deletedAt,
    };
  }

  toSyncData(tag: Tag): TagSyncData {
    return toTagSyncData(tag);
  }

  async upsertBySync(executor: Executor, docs: SyncUpsertPayload<TagSyncData>[]): Promise<void> {
    for (const doc of docs) {
      const data = parseTagSyncData(doc.id, doc.data);

      await executor
        .insertInto('tags')
        .values({
          id: doc.id,
          category_id: data.categoryId,
          label: data.label,
          color: data.color,
          icon: data.icon,
          sort_order: data.sortOrder,
          archived_at: data.archivedAt,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            category_id: data.categoryId,
            label: data.label,
            color: data.color,
            icon: data.icon,
            sort_order: data.sortOrder,
            archived_at: data.archivedAt,
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
        .updateTable('tags')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
