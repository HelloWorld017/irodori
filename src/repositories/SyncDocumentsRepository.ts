import { sql } from 'kysely';
import type { Database, Executor } from '.';
import type { Repository } from '@/types/Repository';
import type { DatabaseDocument, ShardDocument } from 'clxdb';
import type { Kysely } from 'kysely';

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

type PendingSyncDocument = {
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

const writeDocuments = async (
  executor: Executor,
  documents: UpsertableDocument[]
): Promise<void> => {
  if (documents.length === 0) {
    return;
  }

  for (const doc of documents) {
    const serializedData = serializeSyncDocumentData(doc.data);

    await executor
      .insertInto('sync_documents')
      .values({
        id: doc.id,
        at: doc.at,
        seq: doc.seq,
        del: doc.del ? 1 : 0,
        data: serializedData,
      })
      .onConflict(conflict =>
        conflict.column('id').doUpdateSet({
          at: doc.at,
          seq: doc.seq,
          del: doc.del ? 1 : 0,
          data: serializedData,
        })
      )
      .execute();
  }
};

export class SyncDocumentsRepository implements Repository {
  private readonly subscribers = new Set<() => void>();
  private schemaInitialized = false;

  constructor(private readonly db: Kysely<Database>) {}

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
        PRIMARY KEY (id)
      )
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS sync_documents_seq_idx
      ON sync_documents (seq)
    `.execute(this.db);

    this.schemaInitialized = true;
  }

  async readDocuments(ids: string[]): Promise<(DatabaseDocument | null)[]> {
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

      const doc: DatabaseDocument = {
        id: row.id,
        at: row.at,
        seq: row.seq,
        del: row.del !== 0,
      };

      const parsedData = parseSyncDocumentData(row.data);

      if (parsedData !== undefined) {
        doc.data = parsedData;
      }

      return doc;
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

  async upsertDocuments(executor: Executor, documents: ShardDocument[]): Promise<void> {
    const upsertableDocuments: UpsertableDocument[] = documents.map(doc => ({
      id: doc.id,
      at: doc.at,
      seq: doc.seq,
      del: doc.del,
      data: doc.data as SyncDocumentData,
    }));

    await writeDocuments(executor, upsertableDocuments);
  }

  async deleteDocuments(executor: Executor, documents: ShardDocument[]): Promise<void> {
    const upsertableDocuments: UpsertableDocument[] = documents.map(doc => ({
      id: doc.id,
      at: doc.at,
      seq: doc.seq,
      del: true,
    }));

    await writeDocuments(executor, upsertableDocuments);
  }

  async stageDocuments(executor: Executor, documents: PendingSyncDocument[]): Promise<void> {
    const upsertableDocuments: UpsertableDocument[] = documents.map(doc => ({
      id: doc.id,
      at: doc.at,
      seq: null,
      del: doc.del,
      data: doc.data,
    }));

    await writeDocuments(executor, upsertableDocuments);

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

  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => {
      subscriber();
    });
  }
}
