import { sql } from 'kysely';
import { VERSION } from '@/constants/database';
import { tagSyncDataSchema } from './_schema/TagsSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { TagSyncData } from './_schema/TagsSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { TagSyncData } from './_schema/TagsSchema';

export type TagsTable = {
  id: string;
  category_id: string;
  label: string;
  icon: string | null;
  color: string | null;
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
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TagViewItem = Omit<Tag, 'icon' | 'color'> & {
  displayed: boolean;
  icon: string | null;
  color: string;
};

export type CreateTagInput = {
  id: string;
  categoryId: string;
  label: string;
  icon: string | null;
  color: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpdateTagInput = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
  updatedAt: number;
};

export type SearchTagsInput = {
  notebookId: string;
  id?: string;
  categoryIds?: string[];
  query?: string;
  queryMode?: 'contains' | 'exact';
  limit?: number;
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
  version: VERSION,
  categoryId: tag.categoryId,
  label: tag.label,
  icon: tag.icon,
  color: tag.color,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
  deletedAt: tag.deletedAt,
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

const normalizeSearchCategoryIds = (categoryIds: string[] | undefined): string[] => {
  if (!categoryIds) {
    return [];
  }

  return [...new Set(categoryIds.map(categoryId => categoryId.trim()).filter(Boolean))];
};

export class TagsRepository implements SyncedRepository<TagSyncData, Executor>, Repository {
  readonly syncNamespace = 'tag';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listTagsByCategoryId(categoryId: string): Promise<TagViewItem[]> {
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

    const rows = await query.orderBy('tags.created_at', 'desc').execute();

    return rows.map(toTagViewItem);
  }

  async listTagsByNotebookId(notebookId: string): Promise<TagViewItem[]> {
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
    const categoryIds = normalizeSearchCategoryIds(input.categoryIds);

    if (categoryIds.length === 0 && input.categoryIds) {
      return [];
    }

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

    if (input.id) {
      query = query.where('tags.id', '=', input.id);
    }

    if (categoryIds.length > 0) {
      query = query.where('tags.category_id', 'in', categoryIds);
    }

    if (searchQuery) {
      query = query.where(
        'tags.label',
        input.queryMode === 'exact' ? '=' : 'like',
        input.queryMode === 'exact' ? searchQuery : `%${searchQuery}%`
      );
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
