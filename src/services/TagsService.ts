import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Tag } from '@/repositories/TagsRepository';

type CreateTagInput = {
  categoryId: string;
  label: string;
  color: string;
  icon?: string | null;
  archivedAt?: number | null;
};

type UpdateTagInput = {
  id: string;
  label: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  archivedAt: number | null;
};

type RemoveTagInput = {
  id: string;
};

const normalizeLabel = (value: string): string => {
  const label = value.trim();

  if (!label) {
    throw new Error('Tag label is required.');
  }

  return label;
};

const normalizeColor = (value: string): string => {
  const color = value.trim();

  if (!color) {
    throw new Error('Tag color is required.');
  }

  return color;
};

const assertTagExists = (tag: Tag | null, id: string): Tag => {
  if (!tag) {
    throw new Error(`Tag not found: id=${id}`);
  }

  return tag;
};

export class TagsService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  listByCategoryId(categoryId: string): Promise<Tag[]> {
    return this.repositories.tags.listTagsByCategoryId(categoryId);
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const label = normalizeLabel(input.label);
    const color = normalizeColor(input.color);

    return this.repositories.withTransaction(async trx => {
      const tag = await this.repositories.tags.createTag(trx, {
        id,
        categoryId: input.categoryId,
        label,
        color,
        icon: input.icon ?? null,
        archivedAt: input.archivedAt ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageTag(trx, tag);
      return tag;
    });
  }

  async update(input: UpdateTagInput): Promise<Tag> {
    const now = Date.now();
    const label = normalizeLabel(input.label);
    const color = normalizeColor(input.color);

    return this.repositories.withTransaction(async trx => {
      const tag = assertTagExists(
        await this.repositories.tags.updateTag(trx, {
          id: input.id,
          label,
          color,
          icon: input.icon,
          sortOrder: input.sortOrder,
          archivedAt: input.archivedAt,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageTag(trx, tag);
      return tag;
    });
  }

  async remove(input: RemoveTagInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const tag = assertTagExists(
        await this.repositories.tags.deleteTag(trx, {
          id: input.id,
          deletedAt: now,
        }),
        input.id
      );

      await this.stageTag(trx, tag);
    });
  }

  private stageTag(trx: Executor, tag: Tag): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.tags, [
      {
        id: tag.id,
        data: this.repositories.tags.toSyncData(tag),
      },
    ]);
  }
}
