import { sql } from 'kysely';
import { VERSION } from '@/constants/database';
import { tagCategorySyncDataSchema } from './_schema/TagCategoriesSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { TagCategorySyncData } from './_schema/TagCategoriesSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { TagCategorySyncData } from './_schema/TagCategoriesSchema';

export type TagCategoriesTable = {
  id: string;
  notebook_id: string;
  label: string;
  icon: string | null;
  color: string;
  displayed: number;
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
  icon: string | null;
  color: string;
  displayed: boolean;
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
  icon: string | null;
  color: string;
  displayed: boolean;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  createdAt: number;
  updatedAt: number;
};

export type UpdateTagCategoryInput = {
  id: string;
  label: string;
  icon: string | null;
  color: string;
  displayed: boolean;
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

export type SearchTagCategoriesInput = {
  notebookId: string;
  query: string;
  exact?: boolean;
  limit?: number;
};

const toTagCategory = (row: Selectable<TagCategoriesTable>): TagCategory => ({
  id: row.id,
  notebookId: row.notebook_id,
  label: row.label,
  icon: row.icon,
  color: row.color,
  displayed: row.displayed !== 0,
  sortOrder: row.sort_order,
  minSelect: row.min_select,
  maxSelect: row.max_select,
  required: row.required !== 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toTagCategorySyncData = (category: TagCategory): TagCategorySyncData => ({
  version: VERSION,
  notebookId: category.notebookId,
  label: category.label,
  icon: category.icon,
  color: category.color,
  displayed: category.displayed,
  sortOrder: category.sortOrder,
  minSelect: category.minSelect,
  maxSelect: category.maxSelect,
  required: category.required,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  deletedAt: category.deletedAt,
});

const parseTagCategorySyncData = (id: string, data: unknown): TagCategorySyncData =>
  parseSyncDataOrThrow(tagCategorySyncDataSchema, 'tag category', id, data);

const normalizeSearchQuery = (query: string): string => query.trim();

const normalizeSearchLimit = (value: number | undefined): number => {
  if (value === undefined) {
    return 20;
  }

  return Math.max(1, Math.min(value, 100));
};

export class TagCategoriesRepository
  implements SyncedRepository<TagCategorySyncData, Executor>, Repository
{
  readonly syncNamespace = 'tag-category';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listTagCategoriesByNotebookId(notebookId: string): Promise<TagCategory[]> {
    const rows = await this.db
      .selectFrom('tag_categories')
      .selectAll()
      .where('notebook_id', '=', notebookId)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toTagCategory);
  }

  async searchTagCategories(input: SearchTagCategoriesInput): Promise<TagCategory[]> {
    const query = normalizeSearchQuery(input.query);
    if (!query) {
      return [];
    }

    const limit = normalizeSearchLimit(input.limit);
    const operator = input.exact ? '=' : 'like';
    const value = input.exact ? query : `%${query}%`;

    const rows = await this.db
      .selectFrom('tag_categories')
      .selectAll()
      .where('notebook_id', '=', input.notebookId)
      .where('deleted_at', 'is', null)
      .where('label', operator, value)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'desc')
      .limit(limit)
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
      icon: input.icon,
      color: input.color,
      displayed: input.displayed,
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
        icon: category.icon,
        color: category.color,
        displayed: category.displayed ? 1 : 0,
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
        icon: input.icon,
        color: input.color,
        displayed: input.displayed ? 1 : 0,
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
      icon: input.icon,
      color: input.color,
      displayed: input.displayed,
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
          icon: data.icon,
          color: data.color,
          displayed: data.displayed ? 1 : 0,
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
            icon: data.icon,
            color: data.color,
            displayed: data.displayed ? 1 : 0,
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
