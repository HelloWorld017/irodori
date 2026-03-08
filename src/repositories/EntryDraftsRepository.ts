import { VERSION } from '@/constants/database';
import { entryDraftDataSchema, entryDraftSyncDataSchema } from './_schema/EntryDraftsSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { EntryDraftData, EntryDraftSyncData } from './_schema/EntryDraftsSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type {
  EntryDraftCover,
  EntryDraftData,
  EntryDraftSticker,
  EntryDraftSyncData,
} from './_schema/EntryDraftsSchema';

export type EntryDraftsTable = {
  entry_id: string;
  data: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntryDraftsDatabase = {
  entry_drafts: EntryDraftsTable;
};

export type EntryDraft = {
  entryId: string;
  data: EntryDraftData;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type UpsertEntryDraftInput = {
  entryId: string;
  data: EntryDraftData;
  createdAt: number;
  updatedAt: number;
};

export type DeleteEntryDraftInput = {
  entryId: string;
  deletedAt: number;
};

const toEntryDraft = (row: Selectable<EntryDraftsTable>): EntryDraft => ({
  entryId: row.entry_id,
  data: parseEntryDraftData(row.entry_id, row.data),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryDraftSyncData = (entryDraft: EntryDraft): EntryDraftSyncData => ({
  version: VERSION,
  entryId: entryDraft.entryId,
  data: entryDraft.data,
  createdAt: entryDraft.createdAt,
  updatedAt: entryDraft.updatedAt,
  deletedAt: entryDraft.deletedAt,
});

const parseEntryDraftData = (entryId: string, data: string): EntryDraftData => {
  const parsed = JSON.parse(data) as unknown;
  return parseSyncDataOrThrow(entryDraftDataSchema, 'entry draft data', entryId, parsed);
};

const serializeEntryDraftData = (data: EntryDraftData): string => JSON.stringify(data);

const parseEntryDraftSyncData = (id: string, data: unknown): EntryDraftSyncData =>
  parseSyncDataOrThrow(entryDraftSyncDataSchema, 'entry draft', id, data);

export class EntryDraftsRepository
  implements SyncedRepository<EntryDraftSyncData, Executor>, Repository
{
  readonly syncNamespace = 'entry-draft';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async readEntryDraftByEntryId(entryId: string): Promise<EntryDraft | null> {
    const row = await this.db
      .selectFrom('entry_drafts')
      .selectAll()
      .where('entry_id', '=', entryId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toEntryDraft(row) : null;
  }

  async upsertEntryDraft(executor: Executor, input: UpsertEntryDraftInput): Promise<EntryDraft> {
    const currentRow = await executor
      .selectFrom('entry_drafts')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .executeTakeFirst();

    const entryDraft: EntryDraft = {
      entryId: input.entryId,
      data: input.data,
      createdAt: currentRow?.created_at ?? input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entry_drafts')
      .values({
        entry_id: entryDraft.entryId,
        data: serializeEntryDraftData(entryDraft.data),
        created_at: entryDraft.createdAt,
        updated_at: entryDraft.updatedAt,
        deleted_at: entryDraft.deletedAt,
      })
      .onConflict(conflict =>
        conflict.column('entry_id').doUpdateSet({
          data: serializeEntryDraftData(entryDraft.data),
          created_at: entryDraft.createdAt,
          updated_at: entryDraft.updatedAt,
          deleted_at: null,
        })
      )
      .execute();

    return entryDraft;
  }

  async deleteEntryDraft(
    executor: Executor,
    input: DeleteEntryDraftInput
  ): Promise<EntryDraft | null> {
    const currentRow = await executor
      .selectFrom('entry_drafts')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entry_drafts')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('entry_id', '=', input.entryId)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntryDraft(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(entryDraft: EntryDraft): EntryDraftSyncData {
    return toEntryDraftSyncData(entryDraft);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<EntryDraftSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseEntryDraftSyncData(doc.id, doc.data);

      await executor
        .insertInto('entry_drafts')
        .values({
          entry_id: data.entryId,
          data: serializeEntryDraftData(data.data),
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('entry_id').doUpdateSet({
            data: serializeEntryDraftData(data.data),
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
        .updateTable('entry_drafts')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('entry_id', '=', doc.id)
        .execute();
    }
  }
}
