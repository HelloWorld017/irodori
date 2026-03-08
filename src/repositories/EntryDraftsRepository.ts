import { sql } from 'kysely';
import { z } from 'zod';
import { parseSyncDataOrThrow } from './_utils/parseSyncData';
import type { Database, Executor } from '.';
import type { StickerViewItem } from './StickersRepository';
import type { TagViewItem } from './TagsRepository';
import type {
  Repository,
  SyncDeletePayload,
  SyncedRepository,
  SyncUpsertPayload,
} from '@/types/Repository';
import type { Kysely, Selectable } from 'kysely';

export type EntryDraftCover = {
  id: string;
  blobDigest: string;
  blurhash: string | null;
  mime: string;
  width: number | null;
  height: number | null;
};

export type EntryDraftSticker =
  | {
      slot: number;
      kind: 'sticker';
      sticker: StickerViewItem;
    }
  | {
      slot: number;
      kind: 'emoji';
      emoji: string;
    };

export type EntryDraftData = {
  title: string;
  body: string;
  date: number;
  cover: EntryDraftCover | null;
  tags: TagViewItem[];
  stickers: EntryDraftSticker[];
  excludedTagIds: string[];
};

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

export type EntryDraftSyncData = {
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

const tagViewItemSchema: z.ZodType<TagViewItem> = z.object({
  id: z.string(),
  categoryId: z.string(),
  label: z.string(),
  displayed: z.boolean(),
  icon: z.string().nullable(),
  color: z.string(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const stickerViewItemSchema: z.ZodType<StickerViewItem> = z.object({
  id: z.string(),
  kind: z.enum(['emoji', 'custom']),
  emoji: z.string().nullable(),
  label: z.string(),
  assetId: z.string().nullable(),
  blobDigest: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const entryDraftCoverSchema: z.ZodType<EntryDraftCover> = z.object({
  id: z.string(),
  blobDigest: z.string(),
  blurhash: z.string().nullable(),
  mime: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

const entryDraftStickerSchema: z.ZodType<EntryDraftSticker> = z.discriminatedUnion('kind', [
  z.object({
    slot: z.number().int(),
    kind: z.literal('sticker'),
    sticker: stickerViewItemSchema,
  }),
  z.object({
    slot: z.number().int(),
    kind: z.literal('emoji'),
    emoji: z.string(),
  }),
]);

const entryDraftDataSchema: z.ZodType<EntryDraftData> = z.object({
  title: z.string(),
  body: z.string(),
  date: z.number(),
  cover: entryDraftCoverSchema.nullable(),
  tags: z.array(tagViewItemSchema),
  stickers: z.array(entryDraftStickerSchema),
  excludedTagIds: z.array(z.string()),
});

const entryDraftSyncDataSchema: z.ZodType<EntryDraftSyncData> = z.object({
  entryId: z.string(),
  data: entryDraftDataSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const toEntryDraft = (row: Selectable<EntryDraftsTable>): EntryDraft => ({
  entryId: row.entry_id,
  data: parseEntryDraftData(row.entry_id, row.data),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toEntryDraftSyncData = (entryDraft: EntryDraft): EntryDraftSyncData => ({
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
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS entry_drafts (
        entry_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_drafts_updated_at_idx
      ON entry_drafts (updated_at)
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_drafts_deleted_at_idx
      ON entry_drafts (deleted_at)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

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
