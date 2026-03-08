import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { SearchTagsInput, Tag, TagViewItem } from '@/repositories/TagsRepository';

const normalizeText = (value: string): string => value.trim().toLowerCase();

const isUuidLike = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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

type ResolveTagReferenceInput = {
  notebookId: string;
  reference: string;
  categoryId?: string;
};

type ParsedTagSearchQuery = {
  id: string | null;
  labelQuery: string | null;
  categoryLabelQuery: string | null;
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

const parseTagSearchQuery = (value: string | undefined): ParsedTagSearchQuery => {
  const trimmedValue = value?.trim() ?? '';

  if (!trimmedValue) {
    return {
      id: null,
      labelQuery: null,
      categoryLabelQuery: null,
    };
  }

  if (isUuidLike(trimmedValue)) {
    return {
      id: trimmedValue,
      labelQuery: null,
      categoryLabelQuery: null,
    };
  }

  const separatorIndex = trimmedValue.indexOf(':');
  if (separatorIndex < 0) {
    return {
      id: null,
      labelQuery: trimmedValue,
      categoryLabelQuery: null,
    };
  }

  const categoryLabelQuery = trimmedValue.slice(0, separatorIndex).trim();
  const labelQuery = trimmedValue.slice(separatorIndex + 1).trim();

  return {
    id: null,
    labelQuery: labelQuery || null,
    categoryLabelQuery: categoryLabelQuery || null,
  };
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

  listByNotebookId(notebookId: string): Promise<TagViewItem[]> {
    return this.repositories.tags.listTagsByNotebookId(notebookId);
  }

  listByIds(ids: string[]): Promise<TagViewItem[]> {
    return this.repositories.tags.listTagsByIds(ids);
  }

  async search(input: SearchTagsInput): Promise<TagViewItem[]> {
    const parsedQuery = parseTagSearchQuery(input.query);
    const [tags, categories] = await Promise.all([
      this.repositories.tags.listTagsByNotebookId(input.notebookId, {
        includeArchived: input.includeArchived,
      }),
      this.services.tagCategories.listByNotebookId(input.notebookId),
    ]);

    const categoriesById = new Map(categories.map(category => [category.id, category]));
    const normalizedLabelQuery = parsedQuery.labelQuery
      ? normalizeText(parsedQuery.labelQuery)
      : null;
    const normalizedCategoryLabelQuery = parsedQuery.categoryLabelQuery
      ? normalizeText(parsedQuery.categoryLabelQuery)
      : null;
    const limit = input.limit === undefined ? 20 : Math.max(1, Math.min(input.limit, 100));

    const filteredTags = tags.filter(tag => {
      if (input.categoryId && tag.categoryId !== input.categoryId) {
        return false;
      }

      if (parsedQuery.id) {
        return tag.id === parsedQuery.id;
      }

      if (normalizedLabelQuery && !normalizeText(tag.label).includes(normalizedLabelQuery)) {
        return false;
      }

      if (!normalizedCategoryLabelQuery) {
        return true;
      }

      const category = categoriesById.get(tag.categoryId);
      if (!category) {
        return false;
      }

      return normalizeText(category.label).includes(normalizedCategoryLabelQuery);
    });

    return filteredTags.slice(0, limit);
  }

  async resolveReference(input: ResolveTagReferenceInput): Promise<TagViewItem | null> {
    const tags = await this.repositories.tags.listTagsByNotebookId(input.notebookId);
    const filteredTags = input.categoryId
      ? tags.filter(tag => tag.categoryId === input.categoryId)
      : tags;
    const normalizedReference = input.reference.trim();

    if (!normalizedReference) {
      return null;
    }

    if (isUuidLike(normalizedReference)) {
      return filteredTags.find(tag => tag.id === normalizedReference) ?? null;
    }

    const separatorIndex = normalizedReference.indexOf(':');
    if (separatorIndex < 0) {
      const exactMatches = filteredTags.filter(
        tag => normalizeText(tag.label) === normalizeText(normalizedReference)
      );

      return exactMatches.length === 1 ? exactMatches[0] : null;
    }

    const categoryLabel = normalizedReference.slice(0, separatorIndex).trim();
    const label = normalizedReference.slice(separatorIndex + 1).trim();

    if (!categoryLabel || !label) {
      return null;
    }

    const categories = await this.services.tagCategories.listByNotebookId(input.notebookId);
    const categoryIds = new Set(
      categories
        .filter(category => normalizeText(category.label) === normalizeText(categoryLabel))
        .map(category => category.id)
    );

    if (categoryIds.size === 0) {
      return null;
    }

    const exactMatches = filteredTags.filter(
      tag => categoryIds.has(tag.categoryId) && normalizeText(tag.label) === normalizeText(label)
    );

    return exactMatches.length === 1 ? exactMatches[0] : null;
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
