import type { Repositories } from '@/repositories';
import type { Services } from '@/services';
import type { DatabaseBackend, DatabaseDocument, ShardDocument } from 'clxdb';

type InitializeHandler = (
  uuid: string
) => Promise<{ repositories: Repositories; services: Services }>;

export class ClxDBAdapter implements DatabaseBackend {
  private initializeHandler: InitializeHandler;
  private repositories: Repositories | null = null;
  private services: Services | null = null;

  constructor(initialize: InitializeHandler) {
    this.initializeHandler = initialize;
  }

  async initialize(uuid: string): Promise<void> {
    const { repositories, services } = await this.initializeHandler(uuid);
    this.repositories = repositories;
    this.services = services;
  }

  read(ids: string[]): Promise<(DatabaseDocument | null)[]> {
    return this.getRepositories().syncDocuments.readDocuments(ids);
  }

  readPendingIds(): Promise<string[]> {
    return this.getRepositories().syncDocuments.readPendingIds();
  }

  upsert(data: ShardDocument[]): Promise<void> {
    return this.getServices().sync.upsertBySync(data);
  }

  delete(data: ShardDocument[]): Promise<void> {
    return this.getServices().sync.deleteBySync(data);
  }

  replicate(onUpdate: () => void): () => void {
    return this.getRepositories().syncDocuments.replicate(onUpdate);
  }

  getRepositories(): Repositories {
    if (!this.repositories) {
      throw new Error('ClxDBAdapter is not initialized.');
    }

    return this.repositories;
  }

  getServices(): Services {
    if (!this.services) {
      throw new Error('ClxDBAdapter is not initialized.');
    }

    return this.services;
  }
}
