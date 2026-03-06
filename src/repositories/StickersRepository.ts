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

export type StickerKind = 'emoji' | 'custom';

export type StickersTable = {
  id: string;
  kind: StickerKind;
  emoji: string | null;
  label: string;
  asset_id: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type StickersDatabase = {
  stickers: StickersTable;
};

export type Sticker = {
  id: string;
  kind: StickerKind;
  emoji: string | null;
  label: string;
  assetId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type StickerViewItem = Sticker & {
  blobDigest: string | null;
};

export type StickerSyncData = {
  kind: StickerKind;
  emoji: string | null;
  label: string;
  assetId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type CreateStickerInput = {
  id: string;
  kind: StickerKind;
  emoji: string | null;
  label: string;
  assetId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpdateStickerInput = {
  id: string;
  kind: StickerKind;
  emoji: string | null;
  label: string;
  assetId: string | null;
  updatedAt: number;
};

export type DeleteStickerInput = {
  id: string;
  deletedAt: number;
};

const stickerSyncDataSchema: z.ZodType<StickerSyncData> = z.object({
  kind: z.enum(['emoji', 'custom']),
  emoji: z.string().nullable(),
  label: z.string(),
  assetId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const toSticker = (row: Selectable<StickersTable>): Sticker => ({
  id: row.id,
  kind: row.kind,
  emoji: row.emoji,
  label: row.label,
  assetId: row.asset_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toStickerViewItem = (
  row: Selectable<StickersTable> & { assetBlobDigest: string | null }
): StickerViewItem => ({
  ...toSticker(row),
  blobDigest: row.assetBlobDigest,
});

const toStickerSyncData = (sticker: Sticker): StickerSyncData => ({
  kind: sticker.kind,
  emoji: sticker.emoji,
  label: sticker.label,
  assetId: sticker.assetId,
  createdAt: sticker.createdAt,
  updatedAt: sticker.updatedAt,
  deletedAt: sticker.deletedAt,
});

const parseStickerSyncData = (id: string, data: unknown): StickerSyncData =>
  parseSyncDataOrThrow(stickerSyncDataSchema, 'sticker', id, data);

export class StickersRepository implements SyncedRepository<StickerSyncData, Executor>, Repository {
  readonly syncNamespace = 'sticker';
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS stickers (
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        emoji TEXT,
        label TEXT NOT NULL,
        asset_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS stickers_kind_idx
      ON stickers (kind)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS stickers_deleted_at_idx
      ON stickers (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async listStickers(): Promise<StickerViewItem[]> {
    const rows = await this.db
      .selectFrom('stickers')
      .leftJoin('assets', join =>
        join.onRef('assets.id', '=', 'stickers.asset_id').on('assets.deleted_at', 'is', null)
      )
      .selectAll('stickers')
      .select(sql<string | null>`assets.blob_digest`.as('assetBlobDigest'))
      .where('stickers.deleted_at', 'is', null)
      .orderBy('stickers.created_at', 'desc')
      .execute();

    return rows.map(toStickerViewItem);
  }

  async listStickersByIds(ids: string[]): Promise<StickerViewItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('stickers')
      .leftJoin('assets', join =>
        join.onRef('assets.id', '=', 'stickers.asset_id').on('assets.deleted_at', 'is', null)
      )
      .selectAll('stickers')
      .select(sql<string | null>`assets.blob_digest`.as('assetBlobDigest'))
      .where('stickers.id', 'in', ids)
      .where('stickers.deleted_at', 'is', null)
      .orderBy('stickers.created_at', 'desc')
      .execute();

    return rows.map(toStickerViewItem);
  }

  async readStickerById(id: string): Promise<Sticker | null> {
    const row = await this.db
      .selectFrom('stickers')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return row ? toSticker(row) : null;
  }

  async createSticker(executor: Executor, input: CreateStickerInput): Promise<Sticker> {
    const sticker: Sticker = {
      id: input.id,
      kind: input.kind,
      emoji: input.emoji,
      label: input.label,
      assetId: input.assetId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: null,
    };

    await executor
      .insertInto('stickers')
      .values({
        id: sticker.id,
        kind: sticker.kind,
        emoji: sticker.emoji,
        label: sticker.label,
        asset_id: sticker.assetId,
        created_at: sticker.createdAt,
        updated_at: sticker.updatedAt,
        deleted_at: sticker.deletedAt,
      })
      .execute();

    return sticker;
  }

  async updateSticker(executor: Executor, input: UpdateStickerInput): Promise<Sticker | null> {
    const currentRow = await executor
      .selectFrom('stickers')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('stickers')
      .set({
        kind: input.kind,
        emoji: input.emoji,
        label: input.label,
        asset_id: input.assetId,
        updated_at: input.updatedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toSticker(currentRow),
      kind: input.kind,
      emoji: input.emoji,
      label: input.label,
      assetId: input.assetId,
      updatedAt: input.updatedAt,
    };
  }

  async deleteSticker(executor: Executor, input: DeleteStickerInput): Promise<Sticker | null> {
    const currentRow = await executor
      .selectFrom('stickers')
      .selectAll()
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!currentRow) {
      return null;
    }

    await executor
      .updateTable('stickers')
      .set({
        deleted_at: input.deletedAt,
        updated_at: input.deletedAt,
      })
      .where('id', '=', input.id)
      .where('deleted_at', 'is', null)
      .execute();

    return {
      ...toSticker(currentRow),
      deletedAt: input.deletedAt,
      updatedAt: input.deletedAt,
    };
  }

  toSyncData(sticker: Sticker): StickerSyncData {
    return toStickerSyncData(sticker);
  }

  async upsertBySync(
    executor: Executor,
    docs: SyncUpsertPayload<StickerSyncData>[]
  ): Promise<void> {
    for (const doc of docs) {
      const data = parseStickerSyncData(doc.id, doc.data);

      await executor
        .insertInto('stickers')
        .values({
          id: doc.id,
          kind: data.kind,
          emoji: data.emoji,
          label: data.label,
          asset_id: data.assetId,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
          deleted_at: data.deletedAt,
        })
        .onConflict(conflict =>
          conflict.column('id').doUpdateSet({
            kind: data.kind,
            emoji: data.emoji,
            label: data.label,
            asset_id: data.assetId,
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
        .updateTable('stickers')
        .set({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .where('id', '=', doc.id)
        .execute();
    }
  }
}
