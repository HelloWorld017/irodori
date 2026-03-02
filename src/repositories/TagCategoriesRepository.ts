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

export type TagCategoriesTable = {
  id: string;
  notebook_id: string;
  label: string;
  sort_order: number;
  min_select: number;
  max_select: number | null;
  required: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type TagCategoriesDatabase = {
  tag_categories: TagCategoriesTable;
};

export type TagCategory = {
  id: string;
  notebookId: string;
  label: string;
  sortOrder: number;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TagCategorySyncData = {
  notebookId: string;
  label: string;
  sortOrder: number;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateTagCategoryInput = {
  id: string;
  notebookId: string;
  label: string;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  createdAt: number;
  updatedAt: number;
};

export type UpdateTagCategoryInput = {
  id: string;
  label: string;
  sortOrder: number;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  updatedAt: number;
};

export type DeleteTagCategoryInput = {
  id: string;
  deletedAt: number;
};

const toTagCategory = (row: Selectable<TagCategoriesTable>): TagCategory => ({
  id: row.id,
  notebookId: row.notebook_id,
  label: row.label,
  sortOrder: row.sort_order,
  minSelect: row.min_select,
  maxSelect: row.max_select,
  required: row.required !== 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toTagCategorySyncData = (category: TagCategory): TagCategorySyncData => ({
  notebookId: category.notebookId,
  label: category.label,
  sortOrder: category.sortOrder,
  minSelect: category.minSelect,
  maxSelect: category.maxSelect,
  required: category.required,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  deletedAt: category.deletedAt,
});

const tagCategorySyncDataSchema: z.ZodType<TagCategorySyncData> = z.object({
  notebookId: z.string(),
  label: z.string(),
  sortOrder: z.number(),
  minSelect: z.number(),
  maxSelect: z.number().nullable(),
  required: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const parseTagCategorySyncData = (id: string, data: unknown): TagCategorySyncData =>
  parseSyncDataOrThrow(tagCategorySyncDataSchema, 'tag category', id, data);

export class TagCategoriesRepository
  implements SyncedRepository<TagCategorySyncData, Executor>, Repository
{
  readonly syncNamespace = 'tag-category';
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS tag_categories (
        id TEXT NOT NULL,
        notebook_id TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        min_select INTEGER NOT NULL DEFAULT 0,
        max_select INTEGER,
        required INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tag_categories_notebook_id_idx
      ON tag_categories (notebook_id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tag_categories_sort_order_idx
      ON tag_categories (sort_order)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS tag_categories_deleted_at_idx
      ON tag_categories (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async listTagCategoriesByNotebookId(notebookId: string): Promise<TagCategory[]> {
    const rows = await this.db
      .selectFrom('tag_categories')
      .selectAll()
      .where('notebook_id', '=', notebookId)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(toTagCategory);
  }

  async readTagCategoryById(id: string): Promise<TagCategory | null> {
    const row = await this.db
      .selectFrom('tag_categories')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toTagCategory(row) : null;
  }

  async createTagCategory(executor: Executor, input: CreateTagCategoryInput): Promise<TagCategory> {
    const sortOrderRow = await executor
      .selectFrom('tag_categories')
      .select(sql<number>`coalesce(max(sort_order), -1)`.as('maxSortOrder'))
      .where('notebook_id', '=', input.notebookId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    const category: TagCategory = {
      id: input.id,
      notebookId: input.notebookId,
      label: input.label,
      sortOrder: sortOrderRow.maxSortOrder + 1,
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
      required: input.required,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('tag_categories')
      .values({
        id: category.id,
        notebook_id: category.notebookId,
        label: category.label,
        sort_order: category.sortOrder,
        min_select: category.minSelect,
        max_select: category.maxSelect,
        required: category.required ? 1 : 0,
        created_at: category.createdAt,
        updated_at: category.updatedAt,
        deleted_at: category.deletedAt,
      })
      .execute();

    return category;
  }

  async updateTagCategory(
    executor: Executor,
    input: UpdateTagCategoryInput
  ): Promise<TagCategory | null> {
    const currentRow = await executor
      .selectFrom('tag_categories')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('tag_categories')
      .set({
        label: input.label,
        sort_order: input.sortOrder,
        min_select: input.minSelect,
        max_select: input.maxSelect,
        required: input.required ? 1 : 0,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toTagCategory(currentRow),
      label: input.label,
      sortOrder: input.sortOrder,
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
      required: input.required,
      updatedAt: input.updatedAt,
    };
  }

  async deleteTagCategory(
    executor: Executor,
    input: DeleteTagCategoryInput
  ): Promise<TagCategory | null> {
    const currentRow = await executor
      .selectFrom('tag_categories')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('tag_categories')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toTagCategory(currentRow),
      deletedAt: input.deletedAt,
      updatedAt: input.deletedAt,
    };
  }

  toSyncData(category: TagCategory): TagCategorySyncData {
    return toTagCategorySyncData(category);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<TagCategorySyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseTagCategorySyncData(doc.id, doc.data);

      await executor
        .insertInto('tag_categories')
        .values({
          id: doc.id,
          notebook_id: data.notebookId,
          label: data.label,
          sort_order: data.sortOrder,
          min_select: data.minSelect,
          max_select: data.maxSelect,
          required: data.required ? 1 : 0,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            notebook_id: data.notebookId,
            label: data.label,
            sort_order: data.sortOrder,
            min_select: data.minSelect,
            max_select: data.maxSelect,
            required: data.required ? 1 : 0,
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
        .updateTable('tag_categories')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
