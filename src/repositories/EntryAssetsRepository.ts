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

const ENTRY_ASSET_SEPARATOR = ':';

export type EntryAssetUsage = 'cover' | 'inline';

type EntryAssetIdentity = {
  entryId: string;
  assetId: string;
  usage: EntryAssetUsage;
};

export const toEntryAssetEntityId = (
  entryId: string,
  assetId: string,
  usage: EntryAssetUsage
): string => `${entryId}${ENTRY_ASSET_SEPARATOR}${assetId}${ENTRY_ASSET_SEPARATOR}${usage}`;

const isEntryAssetUsage = (value: unknown): value is EntryAssetUsage =>
  value === 'cover' || value === 'inline';

const parseEntryAssetEntityId = (id: string): EntryAssetIdentity => {
  const parts = id.split(ENTRY_ASSET_SEPARATOR);

  if (parts.length !== 3) {
    throw new Error(`Invalid entry asset id: ${id}`);
  }

  const [entryId, assetId, usage] = parts;
  if (!entryId || !assetId || !isEntryAssetUsage(usage)) {
    throw new Error(`Invalid entry asset id: ${id}`);
  }

  return {
    entryId,
    assetId,
    usage,
  };
};

export type EntryAssetsTable = {
  entry_id: string;
  asset_id: string;
  usage: EntryAssetUsage;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type EntryAssetsDatabase = {
  entry_assets: EntryAssetsTable;
};

export type EntryAsset = {
  entryId: string;
  assetId: string;
  usage: EntryAssetUsage;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type EntryAssetSyncData = {
  entryId: string;
  assetId: string;
  usage: EntryAssetUsage;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type UpsertEntryAssetInput = {
  entryId: string;
  assetId: string;
  usage: EntryAssetUsage;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type DeleteEntryAssetInput = {
  entryId: string;
  assetId: string;
  usage: EntryAssetUsage;
  deletedAt: number;
};

const toEntryAsset = (row: Selectable<EntryAssetsTable>): EntryAsset => ({
  entryId: row.entry_id,
  assetId: row.asset_id,
  usage: row.usage,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryAssetSyncData = (entryAsset: EntryAsset): EntryAssetSyncData => ({
  entryId: entryAsset.entryId,
  assetId: entryAsset.assetId,
  usage: entryAsset.usage,
  sortOrder: entryAsset.sortOrder,
  createdAt: entryAsset.createdAt,
  updatedAt: entryAsset.updatedAt,
  deletedAt: entryAsset.deletedAt,
});

const entryAssetSyncDataSchema: z.ZodType<EntryAssetSyncData> = z.object({
  entryId: z.string(),
  assetId: z.string(),
  usage: z.enum(['cover', 'inline']),
  sortOrder: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const parseEntryAssetSyncData = (id: string, data: unknown): EntryAssetSyncData =>
  parseSyncDataOrThrow(entryAssetSyncDataSchema, 'entry asset', id, data);

export class EntryAssetsRepository
  implements SyncedRepository<EntryAssetSyncData, Executor>, Repository
{
  readonly syncNamespace = 'entry-asset';
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS entry_assets (
        entry_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        usage TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id, asset_id, usage)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_assets_entry_id_idx
      ON entry_assets (entry_id)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_assets_usage_sort_order_idx
      ON entry_assets (usage, sort_order)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_assets_deleted_at_idx
      ON entry_assets (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async listEntryAssetsByEntryId(
    entryId: string,
    options?: { usage?: EntryAssetUsage }
  ): Promise<EntryAsset[]> {
    let query = this.db
      .selectFrom('entry_assets')
      .selectAll()
      .where('entry_id', '=', entryId)
      .where('deleted_at', 'is', null);

    if (options?.usage) {
      query = query.where('usage', '=', options.usage);
    }

    const rows = await query.orderBy('usage', 'asc').orderBy('sort_order', 'asc').execute();
    return rows.map(toEntryAsset);
  }

  async upsertEntryAsset(executor: Executor, input: UpsertEntryAssetInput): Promise<EntryAsset> {
    const entryAsset: EntryAsset = {
      entryId: input.entryId,
      assetId: input.assetId,
      usage: input.usage,
      sortOrder: input.sortOrder,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('entry_assets')
      .values({
        entry_id: entryAsset.entryId,
        asset_id: entryAsset.assetId,
        usage: entryAsset.usage,
        sort_order: entryAsset.sortOrder,
        created_at: entryAsset.createdAt,
        updated_at: entryAsset.updatedAt,
        deleted_at: entryAsset.deletedAt,
      })
      .onConflict(conflict =>
        conflict.columns(['entry_id', 'asset_id', 'usage']).doUpdateSet({
          sort_order: entryAsset.sortOrder,
          created_at: entryAsset.createdAt,
          updated_at: entryAsset.updatedAt,
          deleted_at: null,
        })
      )
      .execute();

    return entryAsset;
  }

  async deleteEntryAsset(
    executor: Executor,
    input: DeleteEntryAssetInput
  ): Promise<EntryAsset | null> {
    const currentRow = await executor
      .selectFrom('entry_assets')
      .selectAll()
      .where('entry_id', '=', input.entryId)
      .where('asset_id', '=', input.assetId)
      .where('usage', '=', input.usage)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('entry_assets')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('entry_id', '=', input.entryId)
      .where('asset_id', '=', input.assetId)
      .where('usage', '=', input.usage)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toEntryAsset(currentRow),
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    };
  }

  toSyncData(entryAsset: EntryAsset): EntryAssetSyncData {
    return toEntryAssetSyncData(entryAsset);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<EntryAssetSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseEntryAssetSyncData(doc.id, doc.data);

      await executor
        .insertInto('entry_assets')
        .values({
          entry_id: data.entryId,
          asset_id: data.assetId,
          usage: data.usage,
          sort_order: data.sortOrder,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.columns(['entry_id', 'asset_id', 'usage']).doUpdateSet({
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
      const entryAssetIdentity = parseEntryAssetEntityId(doc.id);

      await executor
        .updateTable('entry_assets')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('entry_id', '=', entryAssetIdentity.entryId)
        .where('asset_id', '=', entryAssetIdentity.assetId)
        .where('usage', '=', entryAssetIdentity.usage)
        .execute();
    }
  }
}
