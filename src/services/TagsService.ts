import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type {
  SearchTagsInput as RepositorySearchTagsInput,
  Tag,
  TagViewItem,
} from '@/repositories/TagsRepository';

const isUuidLike = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

type CreateTagInput = {
  categoryId: string;
  label: string;
  icon?: string | null;
  color?: string | null;
};

type UpdateTagInput = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
};

type SearchTagsInput = Pick<RepositorySearchTagsInput, 'notebookId' | 'query' | 'limit'> & {
  categoryId?: string;
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
    const categoryIds = await this.resolveCategoryIds({
      notebookId: input.notebookId,
      categoryId: input.categoryId,
      categoryLabelQuery: parsedQuery.categoryLabelQuery,
      exact: false,
      limit: input.limit,
    });

    if (categoryIds !== null && categoryIds.length === 0) {
      return [];
    }

    return this.repositories.tags.searchTags({
      notebookId: input.notebookId,
      id: parsedQuery.id ?? undefined,
      categoryIds: categoryIds ?? undefined,
      query: parsedQuery.labelQuery ?? undefined,
      queryMode: parsedQuery.id ? undefined : 'contains',
      limit: input.limit,
    });
  }

  async resolveReference(input: ResolveTagReferenceInput): Promise<TagViewItem | null> {
    const parsedReference = parseTagSearchQuery(input.reference);
    const categoryIds = await this.resolveCategoryIds({
      notebookId: input.notebookId,
      categoryId: input.categoryId,
      categoryLabelQuery: parsedReference.categoryLabelQuery,
      exact: true,
      limit: 2,
    });

    if (categoryIds !== null && categoryIds.length === 0) {
      return null;
    }

    if (!parsedReference.id && !parsedReference.labelQuery) {
      return null;
    }

    const matches = await this.repositories.tags.searchTags({
      notebookId: input.notebookId,
      id: parsedReference.id ?? undefined,
      categoryIds: categoryIds ?? undefined,
      query: parsedReference.id ? undefined : (parsedReference.labelQuery ?? undefined),
      queryMode: parsedReference.id ? undefined : 'exact',
      limit: 2,
    });

    return matches.length === 1 ? matches[0] : null;
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

  private async resolveCategoryIds({
    notebookId,
    categoryId,
    categoryLabelQuery,
    exact,
    limit,
  }: {
    notebookId: string;
    categoryId?: string;
    categoryLabelQuery: string | null;
    exact: boolean;
    limit?: number;
  }): Promise<string[] | null> {
    if (categoryId) {
      return [categoryId];
    }

    if (!categoryLabelQuery) {
      return null;
    }

    const categories = await this.services.tagCategories.search({
      notebookId,
      query: categoryLabelQuery,
      exact,
      limit,
    });

    return [...new Set(categories.map(category => category.id))];
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
