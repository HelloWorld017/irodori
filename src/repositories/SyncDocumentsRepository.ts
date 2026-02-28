import { sql, type Kysely } from 'kysely';
import type { Repository } from '@/types';
import type { DatabaseDocument, ShardDocument } from 'clxdb';

type SyncDocumentData = Record<string, unknown>;

export type SyncDocumentsTable = {
  id: string;
  at: number;
  seq: number | null;
  del: number;
  data: string | null;
};

export type SyncDocumentsDatabase = {
  sync_documents: SyncDocumentsTable;
};

export type PendingSyncDocument = {
  id: string;
  at: number;
  del: boolean;
  data?: SyncDocumentData;
};

type UpsertableDocument = {
  id: string;
  at: number;
  seq: number | null;
  del: boolean;
  data?: SyncDocumentData;
};

const isSyncDocumentData = (value: unknown): value is SyncDocumentData =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseSyncDocumentData = (data: string | null): SyncDocumentData | undefined => {
  if (!data) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(data) as unknown;
    return isSyncDocumentData(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const serializeSyncDocumentData = (data: SyncDocumentData | undefined): string | null => {
  if (data === undefined) {
    return null;
  }

  return JSON.stringify(data);
};

export class SyncDocumentsRepository implements Repository {
  private readonly subscribers = new Set<() => void>();
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<SyncDocumentsDatabase>) {}

  async initialize(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS sync_documents (
        id TEXT NOT NULL,
        at INTEGER NOT NULL,
        seq INTEGER,
        del INTEGER NOT NULL DEFAULT 0,
        data TEXT,
        PRIMARY KEY id
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS sync_documents_seq_idx
      ON sync_documents seq
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async read(ids: string[]): Promise<(DatabaseDocument | null)[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('sync_documents')
      .select(['id', 'at', 'seq', 'del', 'data'])
      .where('id', 'in', ids)
      .execute();

    const rowsById = new Map(rows.map(row => [row.id, row]));

    return ids.map(id => {
      const row = rowsById.get(id);

      if (!row) {
        return null;
      }

      const document: DatabaseDocument = {
        id: row.id,
        at: row.at,
        seq: row.seq,
        del: row.del !== 0,
      };

      const parsedData = parseSyncDocumentData(row.data);

      if (parsedData !== undefined) {
        document.data = parsedData;
      }

      return document;
    });
  }

  async readPendingIds(): Promise<string[]> {
    const rows = await this.db
      .selectFrom('sync_documents')
      .select('id')
      .where('seq', 'is', null)
      .execute();

    return rows.map(row => row.id);
  }

  async upsert(documents: ShardDocument[]): Promise<void> {
    const upsertableDocuments: UpsertableDocument[] = documents.map(document => ({
      id: document.id,
      at: document.at,
      seq: document.seq,
      del: document.del,
      data: document.data,
    }));

    await this.writeDocuments(upsertableDocuments);
  }

  async delete(documents: ShardDocument[]): Promise<void> {
    const upsertableDocuments: UpsertableDocument[] = documents.map(document => ({
      id: document.id,
      at: document.at,
      seq: document.seq,
      del: true,
    }));

    await this.writeDocuments(upsertableDocuments);
  }

  async stagePending(documents: PendingSyncDocument[]): Promise<void> {
    const upsertableDocuments: UpsertableDocument[] = documents.map(document => ({
      id: document.id,
      at: document.at,
      seq: null,
      del: document.del,
      data: document.data,
    }));

    await this.writeDocuments(upsertableDocuments);

    if (upsertableDocuments.length > 0) {
      this.notifySubscribers();
    }
  }

  replicate(onUpdate: () => void): () => void {
    this.subscribers.add(onUpdate);

    return () => {
      this.subscribers.delete(onUpdate);
    };
  }

  private async writeDocuments(documents: UpsertableDocument[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    await this.db.transaction().execute(async trx => {
      for (const document of documents) {
        const serializedData = serializeSyncDocumentData(document.data);

        await trx
          .insertInto('sync_documents')
          .values({
            id: document.id,
            at: document.at,
            seq: document.seq,
            del: document.del ? 1 : 0,
            data: serializedData,
          })
          .onConflict(conflict =>
            conflict.column('id').doUpdateSet({
              at: document.at,
              seq: document.seq,
              del: document.del ? 1 : 0,
              data: serializedData,
            })
          )
          .execute();
      }
    });
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => {
      subscriber();
    });
  }
}
