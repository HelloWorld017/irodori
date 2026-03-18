import { VERSION } from '@/constants/database';
import { entryLocationSyncDataSchema } from './_schema/EntryLocationsSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { EntryLocationSyncData } from './_schema/EntryLocationsSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { EntryLocationSyncData } from './_schema/EntryLocationsSchema';

const ENTRY_LOCATION_SEPARATOR = ':';

export const toEntryLocationEntityId = (entryId: string, fieldId: string): string =>
  `${entryId}${ENTRY_LOCATION_SEPARATOR}${fieldId}`;

export type EntryLocationsTable = {
  id: string;
  entry_id: string;
  field_id: string;
  lat: number;
  lng: number;
  name: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntryLocationsDatabase = {
  entry_locations: EntryLocationsTable;
};

export type EntryLocation = {
  id: string;
  entryId: string;
  fieldId: string;
  lat: number;
  lng: number;
  name: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type UpsertEntryLocationInput = {
  entryId: string;
  fieldId: string;
  lat: number;
  lng: number;
  name: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DeleteEntryLocationInput = {
  entryId: string;
  fieldId: string;
  deletedAt: number;
};

const toEntryLocation = (row: Selectable<EntryLocationsTable>): EntryLocation => ({
  id: row.id,
  entryId: row.entry_id,
  fieldId: row.field_id,
  lat: row.lat,
  lng: row.lng,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryLocationSyncData = (entryLocation: EntryLocation): EntryLocationSyncData => ({
  version: VERSION,
  entryId: entryLocation.entryId,
  fieldId: entryLocation.fieldId,
  lat: entryLocation.lat,
  lng: entryLocation.lng,
  name: entryLocation.name,
  createdAt: entryLocation.createdAt,
  updatedAt: entryLocation.updatedAt,
  deletedAt: entryLocation.deletedAt,
});

const parseEntryLocationSyncData = (id: string, data: unknown): EntryLocationSyncData =>
  parseSyncDataOrThrow(entryLocationSyncDataSchema, 'entry location', id, data);

export class EntryLocationsRepository
  implements SyncedRepository<EntryLocationSyncData, Executor>, Repository
{
  readonly syncNamespace = 'entry-location';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async readEntryLocation(
    entryId: string,
    fieldId: string,
    executor?: Executor
  ): Promise<EntryLocation | null> {
    const db = executor ?? this.db;
    const row = await db
      .selectFrom('entry_locations')
      .selectAll()
      .where('entry_id', '=', entryId)
      .where('field_id', '=', fieldId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toEntryLocation(row) : null;
  }

  async upsertEntryLocation(
    executor: Executor,
    input: UpsertEntryLocationInput
  ): Promise<EntryLocation> {
    const entryLocation: EntryLocation = {
      id: toEntryLocationEntityId(input.entryId, input.fieldId),
      entryId: input.entryId,
      fieldId: input.fieldId,
      lat: input.lat,
      lng: input.lng,
      name: input.name,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entry_locations')
      .values({
        id: entryLocation.id,
        entry_id: entryLocation.entryId,
        field_id: entryLocation.fieldId,
        lat: entryLocation.lat,
        lng: entryLocation.lng,
        name: entryLocation.name,
        created_at: entryLocation.createdAt,
        updated_at: entryLocation.updatedAt,
        deleted_at: entryLocation.deletedAt,
      })
      .onConflict(conflict =>
        conflict.column('id').doUpdateSet({
          entry_id: entryLocation.entryId,
          field_id: entryLocation.fieldId,
          lat: entryLocation.lat,
          lng: entryLocation.lng,
          name: entryLocation.name,
          created_at: entryLocation.createdAt,
          updated_at: entryLocation.updatedAt,
          deleted_at: null,
        })
      )
      .execute();

    return entryLocation;
  }

  async deleteEntryLocation(
    executor: Executor,
    input: DeleteEntryLocationInput
  ): Promise<EntryLocation | null> {
    const currentRow = await executor
      .selectFrom('entry_locations')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .where('field_id', '=', input.fieldId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entry_locations')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('entry_id', '=', input.entryId)
      .where('field_id', '=', input.fieldId)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntryLocation(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(entryLocation: EntryLocation): EntryLocationSyncData {
    return toEntryLocationSyncData(entryLocation);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<EntryLocationSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseEntryLocationSyncData(doc.id, doc.data);
      const id = toEntryLocationEntityId(data.entryId, data.fieldId);

      if (doc.id !== id) {
        throw new Error(`Invalid entry location id: ${doc.id}`);
      }

      await executor
        .insertInto('entry_locations')
        .values({
          id,
          entry_id: data.entryId,
          field_id: data.fieldId,
          lat: data.lat,
          lng: data.lng,
          name: data.name,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            entry_id: data.entryId,
            field_id: data.fieldId,
            lat: data.lat,
            lng: data.lng,
            name: data.name,
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
        .updateTable('entry_locations')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
