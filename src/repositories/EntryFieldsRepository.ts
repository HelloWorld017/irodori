import { VERSION } from '@/constants/database';
import { entryFieldSyncDataSchema } from './_schema/EntryFieldsSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { EntryFieldSyncData } from './_schema/EntryFieldsSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { EntryFieldSyncData } from './_schema/EntryFieldsSchema';

const ENTRY_FIELD_SEPARATOR = ':';

type EntryFieldIdentity = {
  entryId: string;
  fieldId: string;
};

export const toEntryFieldEntityId = (entryId: string, fieldId: string): string =>
  `${entryId}${ENTRY_FIELD_SEPARATOR}${fieldId}`;

const parseEntryFieldEntityId = (id: string): EntryFieldIdentity => {
  const separatorIndex = id.indexOf(ENTRY_FIELD_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex === id.length - 1) {
    throw new Error(`Invalid entry field id: ${id}`);
  }

  return {
    entryId: id.slice(0, separatorIndex),
    fieldId: id.slice(separatorIndex + 1),
  };
};

export type EntryFieldsTable = {
  entry_id: string;
  field_id: string;
  value: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntryFieldsDatabase = {
  entry_fields: EntryFieldsTable;
};

export type EntryField = {
  entryId: string;
  fieldId: string;
  value: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type UpsertEntryFieldInput = {
  entryId: string;
  fieldId: string;
  value: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DeleteEntryFieldInput = {
  entryId: string;
  fieldId: string;
  deletedAt: number;
};

const toEntryField = (row: Selectable<EntryFieldsTable>): EntryField => ({
  entryId: row.entry_id,
  fieldId: row.field_id,
  value: row.value,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryFieldSyncData = (entryField: EntryField): EntryFieldSyncData => ({
  version: VERSION,
  entryId: entryField.entryId,
  fieldId: entryField.fieldId,
  value: entryField.value,
  createdAt: entryField.createdAt,
  updatedAt: entryField.updatedAt,
  deletedAt: entryField.deletedAt,
});

const parseEntryFieldSyncData = (id: string, data: unknown): EntryFieldSyncData =>
  parseSyncDataOrThrow(entryFieldSyncDataSchema, 'entry field', id, data);

export class EntryFieldsRepository
  implements SyncedRepository<EntryFieldSyncData, Executor>, Repository
{
  readonly syncNamespace = 'entry-field';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listEntryFieldsByEntryId(entryId: string, executor?: Executor): Promise<EntryField[]> {
    const db = executor ?? this.db;
    const rows = await db
      .selectFrom('entry_fields')
      .selectAll()
      .where('entry_id', '=', entryId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toEntryField);
  }

  async upsertEntryField(executor: Executor, input: UpsertEntryFieldInput): Promise<EntryField> {
    const entryField: EntryField = {
      entryId: input.entryId,
      fieldId: input.fieldId,
      value: input.value,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entry_fields')
      .values({
        entry_id: entryField.entryId,
        field_id: entryField.fieldId,
        value: entryField.value,
        created_at: entryField.createdAt,
        updated_at: entryField.updatedAt,
        deleted_at: entryField.deletedAt,
      })
      .onConflict(conflict =>
        conflict.columns(['entry_id', 'field_id']).doUpdateSet({
          value: entryField.value,
          created_at: entryField.createdAt,
          updated_at: entryField.updatedAt,
          deleted_at: null,
        })
      )
      .execute();

    return entryField;
  }

  async deleteEntryField(
    executor: Executor,
    input: DeleteEntryFieldInput
  ): Promise<EntryField | null> {
    const currentRow = await executor
      .selectFrom('entry_fields')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .where('field_id', '=', input.fieldId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entry_fields')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('entry_id', '=', input.entryId)
      .where('field_id', '=', input.fieldId)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntryField(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(entryField: EntryField): EntryFieldSyncData {
    return toEntryFieldSyncData(entryField);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<EntryFieldSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseEntryFieldSyncData(doc.id, doc.data);

      await executor
        .insertInto('entry_fields')
        .values({
          entry_id: data.entryId,
          field_id: data.fieldId,
          value: data.value,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.columns(['entry_id', 'field_id']).doUpdateSet({
            value: data.value,
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
      const entryFieldIdentity = parseEntryFieldEntityId(doc.id);

      await executor
        .updateTable('entry_fields')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('entry_id', '=', entryFieldIdentity.entryId)
        .where('field_id', '=', entryFieldIdentity.fieldId)
        .execute();
    }
  }
}
