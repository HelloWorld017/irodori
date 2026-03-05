import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { SearchTagsInput, Tag, TagViewItem } from '@/repositories/TagsRepository';

type CreateTagInput = {
  categoryId: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  archivedAt?: number | null;
};

type UpdateTagInput = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
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

const normalizeOverrideValue = (value: string | null | undefined): string | null => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
};

const assertTagExists = (tag: Tag | null, id: string): Tag => {
  if (!tag) {
    throw new Error(`Tag not found: id=${id}`);
  }

  return tag;
};

const assertTagViewItemExists = (tag: TagViewItem | null, id: string): TagViewItem => {
  if (!tag) {
    throw new Error(`Tag view item not found: id=${id}`);
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

  listByCategoryId(categoryId: string): Promise<TagViewItem[]> {
    return this.repositories.tags.listTagsByCategoryId(categoryId);
  }

  search(input: SearchTagsInput): Promise<TagViewItem[]> {
    return this.repositories.tags.searchTags(input);
  }

  async create(input: CreateTagInput): Promise<TagViewItem> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const label = normalizeLabel(input.label);
    const icon = normalizeOverrideValue(input.icon);
    const color = normalizeOverrideValue(input.color);

    return this.repositories.withTransaction(async trx => {
      const tag = await this.repositories.tags.createTag(trx, {
        id,
        categoryId: input.categoryId,
        label,
        icon,
        color,
        archivedAt: input.archivedAt ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageTag(trx, tag);
      return assertTagViewItemExists(await this.repositories.tags.readTagById(tag.id, trx), tag.id);
    });
  }

  async update(input: UpdateTagInput): Promise<TagViewItem> {
    const now = Date.now();
    const label = normalizeLabel(input.label);
    const icon = normalizeOverrideValue(input.icon);
    const color = normalizeOverrideValue(input.color);

    return this.repositories.withTransaction(async trx => {
      const tag = assertTagExists(
        await this.repositories.tags.updateTag(trx, {
          id: input.id,
          label,
          icon,
          color,
          archivedAt: input.archivedAt,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageTag(trx, tag);
      return assertTagViewItemExists(await this.repositories.tags.readTagById(tag.id, trx), tag.id);
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
