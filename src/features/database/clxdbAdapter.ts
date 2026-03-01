import { initRepositories } from '../database/initRepositories';
import type { Repositories } from '@/repositories';
import type { DatabaseBackend, DatabaseDocument, ShardDocument } from 'clxdb';

export class ClxDBAdapter implements DatabaseBackend {
  private repositories: Repositories | null = null;

  async initialize(uuid: string): Promise<void> {
    this.repositories = await initRepositories(uuid);
  }

  read(ids: string[]): Promise<(DatabaseDocument | null)[]> {
    return this.repositories!.syncDocuments.read(ids);
  }

  readPendingIds(): Promise<string[]> {
    return this.repositories!.syncDocuments.readPendingIds();
  }

  upsert(data: ShardDocument[]): Promise<void> {
    return this.repositories!.syncDocuments.upsert(data);
  }

  delete(data: ShardDocument[]): Promise<void> {
    return this.repositories!.syncDocuments.delete(data);
  }

  replicate(onUpdate: () => void): () => void {
    return this.repositories!.syncDocuments.replicate(onUpdate);
  }

  getRepositories(): Repositories {
    return this.repositories!;
  }
}
