import { VERSION } from '@/constants/database';
import { entryStickerSyncDataSchema } from './_schema/EntryStickersSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { EntryStickerSyncData } from './_schema/EntryStickersSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { EntryStickerSyncData } from './_schema/EntryStickersSchema';

const ENTRY_STICKER_SEPARATOR = ':';

type EntryStickerIdentity = {
  entryId: string;
  slot: number;
};

export const toEntryStickerEntityId = (entryId: string, slot: number): string =>
  `${entryId}${ENTRY_STICKER_SEPARATOR}${slot}`;

const parseEntryStickerEntityId = (id: string): EntryStickerIdentity => {
  const separatorIndex = id.lastIndexOf(ENTRY_STICKER_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex === id.length - 1) {
    throw new Error(`Invalid entry sticker id: ${id}`);
  }

  const slot = Number(id.slice(separatorIndex + 1));
  if (!Number.isInteger(slot)) {
    throw new Error(`Invalid entry sticker slot: ${id}`);
  }

  return {
    entryId: id.slice(0, separatorIndex),
    slot,
  };
};

export type EntryStickersTable = {
  entry_id: string;
  slot: number;
  sticker_id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntryStickersDatabase = {
  entry_stickers: EntryStickersTable;
};

export type EntrySticker = {
  entryId: string;
  slot: number;
  stickerId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type UpsertEntryStickerInput = {
  entryId: string;
  slot: number;
  stickerId: string;
  createdAt: number;
  updatedAt: number;
};

export type DeleteEntryStickerInput = {
  entryId: string;
  slot: number;
  deletedAt: number;
};

const toEntrySticker = (row: Selectable<EntryStickersTable>): EntrySticker => ({
  entryId: row.entry_id,
  slot: row.slot,
  stickerId: row.sticker_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryStickerSyncData = (entrySticker: EntrySticker): EntryStickerSyncData => ({
  version: VERSION,
  entryId: entrySticker.entryId,
  slot: entrySticker.slot,
  stickerId: entrySticker.stickerId,
  createdAt: entrySticker.createdAt,
  updatedAt: entrySticker.updatedAt,
  deletedAt: entrySticker.deletedAt,
});

const parseEntryStickerSyncData = (id: string, data: unknown): EntryStickerSyncData =>
  parseSyncDataOrThrow(entryStickerSyncDataSchema, 'entry sticker', id, data);

export class EntryStickersRepository
  implements SyncedRepository<EntryStickerSyncData, Executor>, Repository
{
  readonly syncNamespace = 'entry-sticker';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listEntryStickersByEntryId(entryId: string, executor?: Executor): Promise<EntrySticker[]> {
    const db = executor ?? this.db;
    const rows = await db
      .selectFrom('entry_stickers')
      .selectAll()
      .where('entry_id', '=', entryId)
      .where('deleted_at', 'is', null)
      .orderBy('slot', 'asc')
      .execute();

    return rows.map(toEntrySticker);
  }

  async listEntryStickersByEntryIds(entryIds: string[]): Promise<EntrySticker[]> {
    if (entryIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('entry_stickers')
      .selectAll()
      .where('entry_id', 'in', entryIds)
      .where('deleted_at', 'is', null)
      .orderBy('entry_id', 'asc')
      .orderBy('slot', 'asc')
      .execute();

    return rows.map(toEntrySticker);
  }

  async upsertEntrySticker(
    executor: Executor,
    input: UpsertEntryStickerInput
  ): Promise<EntrySticker> {
    const entrySticker: EntrySticker = {
      entryId: input.entryId,
      slot: input.slot,
      stickerId: input.stickerId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entry_stickers')
      .values({
        entry_id: entrySticker.entryId,
        slot: entrySticker.slot,
        sticker_id: entrySticker.stickerId,
        created_at: entrySticker.createdAt,
        updated_at: entrySticker.updatedAt,
        deleted_at: entrySticker.deletedAt,
      })
      .onConflict(conflict =>
        conflict.columns(['entry_id', 'slot']).doUpdateSet({
          sticker_id: entrySticker.stickerId,
          created_at: entrySticker.createdAt,
          updated_at: entrySticker.updatedAt,
          deleted_at: null,
        })
      )
      .execute();

    return entrySticker;
  }

  async deleteEntrySticker(
    executor: Executor,
    input: DeleteEntryStickerInput
  ): Promise<EntrySticker | null> {
    const currentRow = await executor
      .selectFrom('entry_stickers')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .where('slot', '=', input.slot)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entry_stickers')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('entry_id', '=', input.entryId)
      .where('slot', '=', input.slot)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntrySticker(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(entrySticker: EntrySticker): EntryStickerSyncData {
    return toEntryStickerSyncData(entrySticker);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<EntryStickerSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseEntryStickerSyncData(doc.id, doc.data);

      await executor
        .insertInto('entry_stickers')
        .values({
          entry_id: data.entryId,
          slot: data.slot,
          sticker_id: data.stickerId,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.columns(['entry_id', 'slot']).doUpdateSet({
            sticker_id: data.stickerId,
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
      const entryStickerIdentity = parseEntryStickerEntityId(doc.id);

      await executor
        .updateTable('entry_stickers')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('entry_id', '=', entryStickerIdentity.entryId)
        .where('slot', '=', entryStickerIdentity.slot)
        .execute();
    }
  }
}
