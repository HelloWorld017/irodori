export interface Repository {
  initialize(): Promise<void>;
}

export type SyncUpsertPayload<TData> = { id: string; data: TData };
export type SyncDeletePayload = { id: string };

export interface SyncedRepository<TData, TExecutor> extends Repository {
  readonly syncNamespace: string;
  upsertBySync(trx: TExecutor, documents: SyncUpsertPayload<TData>[]): Promise<void>;
  deleteBySync(trx: TExecutor, documents: SyncDeletePayload[]): Promise<void>;
}
