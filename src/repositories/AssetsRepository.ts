import { VERSION } from '@/constants/database';
import { assetSyncDataSchema } from './_schema/AssetsSchema';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { AssetSyncData } from './_schema/AssetsSchema';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type { AssetSyncData } from './_schema/AssetsSchema';

export type AssetStatus = 'pending' | 'uploaded' | 'failed';

export type AssetsTable = {
  id: string;
  blob_digest: string;
  blurhash: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  status: AssetStatus;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type AssetsDatabase = {
  assets: AssetsTable;
};

export type Asset = {
  id: string;
  blobDigest: string;
  blurhash: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  status: AssetStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateAssetInput = {
  id: string;
  blobDigest: string;
  blurhash: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  status: AssetStatus;
  createdAt: number;
  updatedAt: number;
};

export type UpdateAssetInput = {
  id: string;
  blobDigest: string;
  blurhash: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  status: AssetStatus;
  updatedAt: number;
};

export type DeleteAssetInput = {
  id: string;
  deletedAt: number;
};

const toAsset = (row: Selectable<AssetsTable>): Asset => ({
  id: row.id,
  blobDigest: row.blob_digest,
  blurhash: row.blurhash,
  mime: row.mime,
  size: row.size,
  width: row.width,
  height: row.height,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toAssetSyncData = (asset: Asset): AssetSyncData => ({
  version: VERSION,
  blobDigest: asset.blobDigest,
  blurhash: asset.blurhash,
  mime: asset.mime,
  size: asset.size,
  width: asset.width,
  height: asset.height,
  status: asset.status,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
  deletedAt: asset.deletedAt,
});

const parseAssetSyncData = (id: string, data: unknown): AssetSyncData =>
  parseSyncDataOrThrow(assetSyncDataSchema, 'asset', id, data);

export class AssetsRepository implements SyncedRepository<AssetSyncData, Executor>, Repository {
  readonly syncNamespace = 'asset';

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {}

  async listAssets(options?: { status?: AssetStatus }): Promise<Asset[]> {
    let query = this.db.selectFrom('assets').selectAll().where('deleted_at', 'is', null);

    if (options?.status) {
      query = query.where('status', '=', options.status);
    }

    const rows = await query.orderBy('created_at', 'desc').execute();
    return rows.map(toAsset);
  }

  async listAssetsByIds(ids: string[]): Promise<Asset[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('assets')
      .selectAll()
      .where('id', 'in', ids)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toAsset);
  }

  async readAssetById(id: string): Promise<Asset | null> {
    const row = await this.db
      .selectFrom('assets')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toAsset(row) : null;
  }

  async createAsset(executor: Executor, input: CreateAssetInput): Promise<Asset> {
    const asset: Asset = {
      id: input.id,
      blobDigest: input.blobDigest,
      blurhash: input.blurhash,
      mime: input.mime,
      size: input.size,
      width: input.width,
      height: input.height,
      status: input.status,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('assets')
      .values({
        id: asset.id,
        blob_digest: asset.blobDigest,
        blurhash: asset.blurhash,
        mime: asset.mime,
        size: asset.size,
        width: asset.width,
        height: asset.height,
        status: asset.status,
        created_at: asset.createdAt,
        updated_at: asset.updatedAt,
        deleted_at: asset.deletedAt,
      })
      .execute();

    return asset;
  }

  async updateAsset(executor: Executor, input: UpdateAssetInput): Promise<Asset | null> {
    const currentRow = await executor
      .selectFrom('assets')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('assets')
      .set({
        blob_digest: input.blobDigest,
        blurhash: input.blurhash,
        mime: input.mime,
        size: input.size,
        width: input.width,
        height: input.height,
        status: input.status,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toAsset(currentRow),
      blobDigest: input.blobDigest,
      blurhash: input.blurhash,
      mime: input.mime,
      size: input.size,
      width: input.width,
      height: input.height,
      status: input.status,
      updatedAt: input.updatedAt,
    };
  }

  async deleteAsset(executor: Executor, input: DeleteAssetInput): Promise<Asset | null> {
    const currentRow = await executor
      .selectFrom('assets')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('assets')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toAsset(currentRow),
      deletedAt: input.deletedAt,
      updatedAt: input.deletedAt,
    };
  }

  toSyncData(asset: Asset): AssetSyncData {
    return toAssetSyncData(asset);
  }

  async upsertBySync(executor: Executor, docs: SyncUpsertPayload<AssetSyncData>[]): Promise<void> {
    for (const doc of docs) {
      const data = parseAssetSyncData(doc.id, doc.data);

      await executor
        .insertInto('assets')
        .values({
          id: doc.id,
          blob_digest: data.blobDigest,
          blurhash: data.blurhash,
          mime: data.mime,
          size: data.size,
          width: data.width,
          height: data.height,
          status: data.status,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            blob_digest: data.blobDigest,
            blurhash: data.blurhash,
            mime: data.mime,
            size: data.size,
            width: data.width,
            height: data.height,
            status: data.status,
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
        .updateTable('assets')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
