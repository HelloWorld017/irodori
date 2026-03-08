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
  icon: string | null;
  color: string | null;
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
  icon: string | null;
  color: string | null;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TagViewItem = Omit<Tag, 'icon' | 'color'> & {
  displayed: boolean;
  icon: string | null;
  color: string;
};

export type TagSyncData = {
  categoryId: string;
  label: string;
  icon: string | null;
  color: string | null;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateTagInput = {
  id: string;
  categoryId: string;
  label: string;
  icon: string | null;
  color: string | null;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type UpdateTagInput = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
  archivedAt: number | null;
  updatedAt: number;
};

export type SearchTagsInput = {
  notebookId: string;
  categoryId?: string;
  query?: string;
  limit?: number;
  includeArchived?: boolean;
};

export type DeleteTagInput = {
  id: string;
  deletedAt: number;
};

const toTag = (row: Selectable<TagsTable>): Tag => ({
  id: row.id,
  categoryId: row.category_id,
  label: row.label,
  icon: row.icon,
  color: row.color,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toTagViewItem = (
  row: Selectable<TagsTable> & {
    categoryDisplayed: number | boolean | null;
    categoryIcon: string | null;
    categoryColor: string | number | null;
  }
): TagViewItem => {
  if (typeof row.categoryColor !== 'string') {
    throw new Error(`Invalid tag category color: tagId=${row.id}`);
  }

  if (typeof row.categoryDisplayed !== 'number' && typeof row.categoryDisplayed !== 'boolean') {
    throw new Error(`Invalid tag category displayed: tagId=${row.id}`);
  }

  return {
    ...toTag(row),
    displayed: row.categoryDisplayed !== 0,
    icon: row.icon ?? row.categoryIcon,
    color: row.color ?? row.categoryColor,
  };
};

const toTagSyncData = (tag: Tag): TagSyncData => ({
  categoryId: tag.categoryId,
  label: tag.label,
  icon: tag.icon,
  color: tag.color,
  archivedAt: tag.archivedAt,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
  deletedAt: tag.deletedAt,
});

const tagSyncDataSchema: z.ZodType<TagSyncData> = z.object({
  categoryId: z.string(),
  label: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const parseTagSyncData = (id: string, data: unknown): TagSyncData =>
  parseSyncDataOrThrow(tagSyncDataSchema, 'tag', id, data);

const normalizeSearchQuery = (query: string | undefined): string | null => {
  const normalizedQuery = query?.trim();

  return normalizedQuery && normalizedQuery.length > 0 ? normalizedQuery : null;
};

const normalizeSearchLimit = (value: number | undefined): number => {
  if (value === undefined) {
    return 20;
  }

  return Math.max(1, Math.min(value, 100));
};

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
        icon TEXT,
        color TEXT,
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
  ): Promise<TagViewItem[]> {
    let query = this.db
      .selectFrom('tags')
      .innerJoin('tag_categories', 'tag_categories.id', 'tags.category_id')
      .selectAll('tags')
      .select(sql<number>`tag_categories.displayed`.as('categoryDisplayed'))
      .select(sql<string | null>`tag_categories.icon`.as('categoryIcon'))
      .select(sql<string>`tag_categories.color`.as('categoryColor'))
      .where('tags.category_id', '=', categoryId)
      .where('tags.deleted_at', 'is', null)
      .where('tag_categories.deleted_at', 'is', null);

    if (!options?.includeArchived) {
      query = query.where('tags.archived_at', 'is', null);
    }

    const rows = await query.orderBy('tags.created_at', 'desc').execute();

    return rows.map(toTagViewItem);
  }

  async listTagsByNotebookId(
    notebookId: string,
    options?: { includeArchived?: boolean }
  ): Promise<TagViewItem[]> {
    let query = this.db
      .selectFrom('tags')
      .innerJoin('tag_categories', 'tag_categories.id', 'tags.category_id')
      .selectAll('tags')
      .select(sql<number>`tag_categories.displayed`.as('categoryDisplayed'))
      .select(sql<string | null>`tag_categories.icon`.as('categoryIcon'))
      .select(sql<string>`tag_categories.color`.as('categoryColor'))
      .where('tag_categories.notebook_id', '=', notebookId)
      .where('tags.deleted_at', 'is', null)
      .where('tag_categories.deleted_at', 'is', null);

    if (!options?.includeArchived) {
      query = query.where('tags.archived_at', 'is', null);
    }

    const rows = await query
      .orderBy('tag_categories.sort_order', 'asc')
      .orderBy('tags.created_at', 'desc')
      .execute();

    return rows.map(toTagViewItem);
  }

  async listTagsByIds(ids: string[]): Promise<TagViewItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('tags')
      .innerJoin('tag_categories', 'tag_categories.id', 'tags.category_id')
      .selectAll('tags')
      .select(sql<number>`tag_categories.displayed`.as('categoryDisplayed'))
      .select(sql<string | null>`tag_categories.icon`.as('categoryIcon'))
      .select(sql<string>`tag_categories.color`.as('categoryColor'))
      .where('tags.id', 'in', ids)
      .where('tags.deleted_at', 'is', null)
      .where('tag_categories.deleted_at', 'is', null)
      .orderBy('tags.created_at', 'desc')
      .execute();

    return rows.map(toTagViewItem);
  }

  async searchTags(input: SearchTagsInput): Promise<TagViewItem[]> {
    const searchQuery = normalizeSearchQuery(input.query);
    const limit = normalizeSearchLimit(input.limit);

    let query = this.db
      .selectFrom('tags')
      .innerJoin('tag_categories', 'tag_categories.id', 'tags.category_id')
      .selectAll('tags')
      .select(sql<number>`tag_categories.displayed`.as('categoryDisplayed'))
      .select(sql<string | null>`tag_categories.icon`.as('categoryIcon'))
      .select(sql<string>`tag_categories.color`.as('categoryColor'))
      .where('tag_categories.notebook_id', '=', input.notebookId)
      .where('tags.deleted_at', 'is', null)
      .where('tag_categories.deleted_at', 'is', null)
      .orderBy('tag_categories.sort_order', 'asc')
      .orderBy('tags.created_at', 'desc');

    if (input.categoryId) {
      query = query.where('tags.category_id', '=', input.categoryId);
    }

    if (!input.includeArchived) {
      query = query.where('tags.archived_at', 'is', null);
    }

    if (searchQuery) {
      query = query.where('tags.label', 'like', `%${searchQuery}%`);
    }

    const rows = await query.limit(limit).execute();
    return rows.map(toTagViewItem);
  }

  async readTagById(id: string, executor?: Executor): Promise<TagViewItem | null> {
    const db = executor ?? this.db;
    const row = await db
      .selectFrom('tags')
      .innerJoin('tag_categories', 'tag_categories.id', 'tags.category_id')
      .selectAll('tags')
      .select(sql<number>`tag_categories.displayed`.as('categoryDisplayed'))
      .select(sql<string | null>`tag_categories.icon`.as('categoryIcon'))
      .select(sql<string>`tag_categories.color`.as('categoryColor'))
      .where('tags.id', '=', id)
      .where('tags.deleted_at', 'is', null)
      .where('tag_categories.deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toTagViewItem(row) : null;
  }

  async createTag(executor: Executor, input: CreateTagInput): Promise<Tag> {
    const tag: Tag = {
      id: input.id,
      categoryId: input.categoryId,
      label: input.label,
      icon: input.icon,
      color: input.color,
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
        icon: tag.icon,
        color: tag.color,
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
        icon: input.icon,
        color: input.color,
        archived_at: input.archivedAt,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toTag(currentRow),
      label: input.label,
      icon: input.icon,
      color: input.color,
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
          icon: data.icon,
          color: data.color,
          archived_at: data.archivedAt,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            category_id: data.categoryId,
            label: data.label,
            icon: data.icon,
            color: data.color,
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
