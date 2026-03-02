import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { SyncDeletePayload, SyncedRepository, SyncUpsertPayload } from '@/types/Repository';
import type { ShardDocument } from 'clxdb';

type SyncDocumentIdentity = {
  namespace: string;
  entityId: string;
};

const parseSyncDocumentId = (id: string): SyncDocumentIdentity => {
  const separatorIndex = id.indexOf('/');

  if (separatorIndex <= 0 || separatorIndex === id.length - 1) {
    throw new Error(`Invalid Sync DocumentId: ${id}`);
  }

  return {
    namespace: id.slice(0, separatorIndex),
    entityId: id.slice(separatorIndex + 1),
  };
};

const toSyncDocumentId = (namespace: string, entityId: string): string =>
  `${namespace}/${entityId}`;

type AnySyncedRepository = SyncedRepository<unknown, Executor>;
const isSyncRepository = (value: unknown): value is AnySyncedRepository => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SyncedRepository<unknown, Executor>>;
  return (
    typeof candidate.syncNamespace === 'string' &&
    typeof candidate.upsertBySync === 'function' &&
    typeof candidate.deleteBySync === 'function'
  );
};

const buildSyncedRepositoryMap = (repositories: Repositories): Map<string, AnySyncedRepository> => {
  const syncRepositoryMap = new Map<string, AnySyncedRepository>();

  Object.values(repositories as Record<string, unknown>)
    .filter(isSyncRepository)
    .forEach(repository => {
      syncRepositoryMap.set(repository.syncNamespace, repository);
    });

  return syncRepositoryMap;
};

const resolveSyncedRepository = (
  syncRepositoryMap: Map<string, AnySyncedRepository>,
  id: string
): { repository: AnySyncedRepository; entityId: string } => {
  const syncDocumentIdentity = parseSyncDocumentId(id);
  const repository = syncRepositoryMap.get(syncDocumentIdentity.namespace);

  if (!repository) {
    throw new Error(
      `Missing sync repository for namespace '${syncDocumentIdentity.namespace}'. id=${id}`
    );
  }

  return {
    repository,
    entityId: syncDocumentIdentity.entityId,
  };
};

const groupByRepository = (
  syncRepositoryMap: Map<string, AnySyncedRepository>,
  documents: ShardDocument[]
) =>
  Array.from(
    documents
      .reduce((updatesByRepository, doc) => {
        const { repository, entityId } = resolveSyncedRepository(syncRepositoryMap, doc.id);
        if (!updatesByRepository.has(repository)) {
          updatesByRepository.set(repository, []);
        }

        updatesByRepository.get(repository)!.push({ id: entityId, data: doc.data });
        return updatesByRepository;
      }, new Map<AnySyncedRepository, { id: string; data: unknown }[]>())
      .entries()
  );

export class SyncService {
  private readonly syncRepositoryMap: Map<string, AnySyncedRepository>;
  private readonly repositories: Repositories;

  constructor(repositories: Repositories, _services: Services) {
    this.syncRepositoryMap = buildSyncedRepositoryMap(repositories);
    this.repositories = repositories;
  }

  async stageUpdatedDocuments(
    trx: Executor,
    repository: AnySyncedRepository,
    documents: SyncUpsertPayload<unknown>[]
  ): Promise<void> {
    const now = Date.now();

    await this.repositories.syncDocuments.stageDocuments(
      trx,
      documents.map(({ id, data }) => ({
        at: now,
        id: toSyncDocumentId(repository.syncNamespace, id),
        del: false,
        data: data as Record<string, unknown>,
      }))
    );
  }

  async stageDeletedDocuments(
    trx: Executor,
    repository: AnySyncedRepository,
    documents: SyncDeletePayload[]
  ): Promise<void> {
    const now = Date.now();

    await this.repositories.syncDocuments.stageDocuments(
      trx,
      documents.map(({ id }) => ({
        at: now,
        id: toSyncDocumentId(repository.syncNamespace, id),
        del: true,
      }))
    );
  }

  async upsertBySync(documents: ShardDocument[]): Promise<void> {
    await this.repositories.withTransaction(async trx => {
      await Promise.all(
        groupByRepository(this.syncRepositoryMap, documents).map(
          ([repository, documentsByRepository]) =>
            repository.upsertBySync(trx, documentsByRepository)
        )
      );

      await this.repositories.syncDocuments.upsertDocuments(trx, documents);
    });
  }

  async deleteBySync(documents: ShardDocument[]): Promise<void> {
    await this.repositories.withTransaction(async trx => {
      await Promise.all(
        groupByRepository(this.syncRepositoryMap, documents).map(
          ([repository, documentsByRepository]) =>
            repository.deleteBySync(trx, documentsByRepository)
        )
      );

      await this.repositories.syncDocuments.deleteDocuments(trx, documents);
    });
  }
}
