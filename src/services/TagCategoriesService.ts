import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';

type CreateTagCategoryInput = {
  notebookId: string;
  label: string;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
};

type UpdateTagCategoryInput = {
  id: string;
  label: string;
  sortOrder: number;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
};

type RemoveTagCategoryInput = {
  id: string;
};

const normalizeLabel = (value: string): string => {
  const label = value.trim();

  if (!label) {
    throw new Error('Tag category label is required.');
  }

  return label;
};

const assertTagCategoryExists = (tagCategory: TagCategory | null, id: string): TagCategory => {
  if (!tagCategory) {
    throw new Error(`Tag category not found: id=${id}`);
  }

  return tagCategory;
};

export class TagCategoriesService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  listByNotebookId(notebookId: string): Promise<TagCategory[]> {
    return this.repositories.tagCategories.listTagCategoriesByNotebookId(notebookId);
  }

  async create(input: CreateTagCategoryInput): Promise<TagCategory> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const label = normalizeLabel(input.label);

    return this.repositories.withTransaction(async trx => {
      const tagCategory = await this.repositories.tagCategories.createTagCategory(trx, {
        id,
        notebookId: input.notebookId,
        label,
        minSelect: input.minSelect,
        maxSelect: input.maxSelect,
        required: input.required,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageTagCategory(trx, tagCategory);
      return tagCategory;
    });
  }

  async update(input: UpdateTagCategoryInput): Promise<TagCategory> {
    const now = Date.now();
    const label = normalizeLabel(input.label);

    return this.repositories.withTransaction(async trx => {
      const tagCategory = assertTagCategoryExists(
        await this.repositories.tagCategories.updateTagCategory(trx, {
          id: input.id,
          label,
          sortOrder: input.sortOrder,
          minSelect: input.minSelect,
          maxSelect: input.maxSelect,
          required: input.required,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageTagCategory(trx, tagCategory);
      return tagCategory;
    });
  }

  async remove(input: RemoveTagCategoryInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const tagCategory = assertTagCategoryExists(
        await this.repositories.tagCategories.deleteTagCategory(trx, {
          id: input.id,
          deletedAt: now,
        }),
        input.id
      );

      await this.stageTagCategory(trx, tagCategory);
    });
  }

  private stageTagCategory(trx: Executor, tagCategory: TagCategory): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.tagCategories, [
      {
        id: tagCategory.id,
        data: this.repositories.tagCategories.toSyncData(tagCategory),
      },
    ]);
  }
}
