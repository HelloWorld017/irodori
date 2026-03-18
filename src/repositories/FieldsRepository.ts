import { sql } from 'kysely';
import { VERSION } from '@/constants/database';
import { fieldSyncDataSchema } from './_schema/FieldsSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { FieldKind, FieldSyncData } from './_schema/FieldsSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { FieldKind, FieldSyncData } from './_schema/FieldsSchema';

export type FieldsTable = {
  id: string;
  notebook_id: string;
  label: string;
  kind: FieldKind;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type FieldsDatabase = {
  fields: FieldsTable;
};

export type Field = {
  id: string;
  notebookId: string;
  label: string;
  kind: FieldKind;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateFieldInput = {
  id: string;
  notebookId: string;
  label: string;
  kind: FieldKind;
  createdAt: number;
  updatedAt: number;
};

export type UpdateFieldInput = {
  id: string;
  label: string;
  kind: FieldKind;
  sortOrder: number;
  updatedAt: number;
};

export type DeleteFieldInput = {
  id: string;
  deletedAt: number;
};

const toField = (row: Selectable<FieldsTable>): Field => ({
  id: row.id,
  notebookId: row.notebook_id,
  label: row.label,
  kind: row.kind,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toFieldSyncData = (field: Field): FieldSyncData => ({
  version: VERSION,
  notebookId: field.notebookId,
  label: field.label,
  kind: field.kind,
  sortOrder: field.sortOrder,
  createdAt: field.createdAt,
  updatedAt: field.updatedAt,
  deletedAt: field.deletedAt,
});

const parseFieldSyncData = (id: string, data: unknown): FieldSyncData =>
  parseSyncDataOrThrow(fieldSyncDataSchema, 'field', id, data);

export class FieldsRepository implements SyncedRepository<FieldSyncData, Executor>, Repository {
  readonly syncNamespace = 'field';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listFieldsByNotebookId(notebookId: string, executor?: Executor): Promise<Field[]> {
    const db = executor ?? this.db;
    const rows = await db
      .selectFrom('fields')
      .selectAll()
      .where('notebook_id', '=', notebookId)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toField);
  }

  async listFieldsByIds(ids: string[], executor?: Executor): Promise<Field[]> {
    if (ids.length === 0) {
      return [];
    }

    const db = executor ?? this.db;
    const rows = await db
      .selectFrom('fields')
      .selectAll()
      .where('id', 'in', ids)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toField);
  }

  async readFieldById(id: string, executor?: Executor): Promise<Field | null> {
    const db = executor ?? this.db;
    const row = await db
      .selectFrom('fields')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toField(row) : null;
  }

  async createField(executor: Executor, input: CreateFieldInput): Promise<Field> {
    const sortOrderRow = await executor
      .selectFrom('fields')
      .select(sql<number>`coalesce(max(sort_order), -1)`.as('maxSortOrder'))
      .where('notebook_id', '=', input.notebookId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();

    const field: Field = {
      id: input.id,
      notebookId: input.notebookId,
      label: input.label,
      kind: input.kind,
      sortOrder: sortOrderRow.maxSortOrder + 1,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('fields')
      .values({
        id: field.id,
        notebook_id: field.notebookId,
        label: field.label,
        kind: field.kind,
        sort_order: field.sortOrder,
        created_at: field.createdAt,
        updated_at: field.updatedAt,
        deleted_at: field.deletedAt,
      })
      .execute();

    return field;
  }

  async updateField(executor: Executor, input: UpdateFieldInput): Promise<Field | null> {
    const currentRow = await executor
      .selectFrom('fields')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('fields')
      .set({
        label: input.label,
        kind: input.kind,
        sort_order: input.sortOrder,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toField(currentRow),
      label: input.label,
      kind: input.kind,
      sortOrder: input.sortOrder,
      updatedAt: input.updatedAt,
    };
  }

  async deleteField(executor: Executor, input: DeleteFieldInput): Promise<Field | null> {
    const currentRow = await executor
      .selectFrom('fields')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('fields')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toField(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(field: Field): FieldSyncData {
    return toFieldSyncData(field);
  }

  async upsertBySync(executor: Executor, docs: SyncUpsertPayload<FieldSyncData>[]): Promise<void> {
    for (const doc of docs) {
      const data = parseFieldSyncData(doc.id, doc.data);

      await executor
        .insertInto('fields')
        .values({
          id: doc.id,
          notebook_id: data.notebookId,
          label: data.label,
          kind: data.kind,
          sort_order: data.sortOrder,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            notebook_id: data.notebookId,
            label: data.label,
            kind: data.kind,
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
        .updateTable('fields')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
