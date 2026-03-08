import { sql } from 'kysely';
import { VERSION } from '@/constants/database';
import { notebookSyncDataSchema } from './_schema/NotebooksSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { NotebookSyncData } from './_schema/NotebooksSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncUpsertPayload,
  SyncedRepository,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { NotebookSyncData } from './_schema/NotebooksSchema';

export type NotebooksTable = {
  id: string;
  title: string;
  description: string;
  color: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type NotebooksDatabase = {
  notebooks: NotebooksTable;
};

export type Notebook = {
  id: string;
  title: string;
  description: string;
  color: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateNotebookInput = {
  id: string;
  title: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type UpdateNotebookInput = {
  id: string;
  title: string;
  description: string;
  color: string;
  updatedAt: number;
};

export type DeleteNotebookInput = {
  id: string;
  deletedAt: number;
};

const toNotebook = (row: Selectable<NotebooksTable>): Notebook => ({
  id: row.id,
  title: row.title,
  description: row.description,
  color: row.color,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toNotebookSyncData = (notebook: Notebook): NotebookSyncData => ({
  version: VERSION,
  title: notebook.title,
  description: notebook.description,
  color: notebook.color,
  sortOrder: notebook.sortOrder,
  createdAt: notebook.createdAt,
  updatedAt: notebook.updatedAt,
  deletedAt: notebook.deletedAt,
});

const parseNotebookSyncData = (id: string, data: unknown): NotebookSyncData =>
  parseSyncDataOrThrow(notebookSyncDataSchema, 'notebook', id, data);

export class NotebooksRepository
  implements SyncedRepository<NotebookSyncData, Executor>, Repository
{
  readonly syncNamespace = 'notebook';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listNotebooks(): Promise<Notebook[]> {
    const rows = await this.db
      .selectFrom('notebooks')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toNotebook);
  }

  async readNotebookById(id: string): Promise<Notebook | null> {
    const row = await this.db
      .selectFrom('notebooks')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toNotebook(row) : null;
  }

  async createNotebook(executor: Executor, input: CreateNotebookInput): Promise<Notebook> {
    const sortOrderRow = await executor
      .selectFrom('notebooks')
      .select(sql<number>`coalesce(max(sort_order), -1)`.as('maxSortOrder'))
      .executeTakeFirstOrThrow();

    const notebook: Notebook = {
      id: input.id,
      title: input.title,
      description: input.description,
      color: input.color,
      sortOrder: sortOrderRow.maxSortOrder + 1,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('notebooks')
      .values({
        id: notebook.id,
        title: notebook.title,
        description: notebook.description,
        color: notebook.color,
        sort_order: notebook.sortOrder,
        created_at: notebook.createdAt,
        updated_at: notebook.updatedAt,
        deleted_at: notebook.deletedAt,
      })
      .execute();

    return notebook;
  }

  async updateNotebook(executor: Executor, input: UpdateNotebookInput): Promise<Notebook | null> {
    const currentRow = await executor
      .selectFrom('notebooks')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('notebooks')
      .set({
        title: input.title,
        description: input.description,
        color: input.color,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toNotebook(currentRow),
      title: input.title,
      description: input.description,
      color: input.color,
      updatedAt: input.updatedAt,
    };
  }

  async deleteNotebook(executor: Executor, input: DeleteNotebookInput): Promise<Notebook | null> {
    const currentRow = await executor
      .selectFrom('notebooks')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('notebooks')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toNotebook(currentRow),
      deletedAt: input.deletedAt,
      updatedAt: input.deletedAt,
    };
  }

  toSyncData(notebook: Notebook): NotebookSyncData {
    return toNotebookSyncData(notebook);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<NotebookSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseNotebookSyncData(doc.id, doc.data);

      await executor
        .insertInto('notebooks')
        .values({
          id: doc.id,
          title: data.title,
          description: data.description,
          color: data.color,
          sort_order: data.sortOrder,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            title: data.title,
            description: data.description,
            color: data.color,
            sort_order: data.sortOrder,
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
        .updateTable('notebooks')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
