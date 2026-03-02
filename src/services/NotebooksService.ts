import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Notebook } from '@/repositories/NotebooksRepository';

type CreateNotebookInput = {
  title: string;
  description?: string;
  color: string;
};

type UpdateNotebookInput = {
  id: string;
  title: string;
  description?: string;
  color: string;
};

type RemoveNotebookInput = {
  id: string;
};

const normalizeNotebookTitle = (value: string): string => {
  const title = value.trim();
  if (!title) {
    throw new Error('Notebook title is required.');
  }

  return title;
};

const normalizeNotebookDescription = (value: string | undefined): string => value?.trim() ?? '';

const assertNotebookExists = (notebook: Notebook | null, id: string): Notebook => {
  if (!notebook) {
    throw new Error(`Notebook not found: id=${id}`);
  }

  return notebook;
};

export class NotebooksService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  list(): Promise<Notebook[]> {
    return this.repositories.notebooks.listNotebooks();
  }

  getById(id: string): Promise<Notebook | null> {
    return this.repositories.notebooks.readNotebookById(id);
  }

  async create(input: CreateNotebookInput): Promise<Notebook> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const title = normalizeNotebookTitle(input.title);
    const description = normalizeNotebookDescription(input.description);
    const color = input.color;

    return this.repositories.withTransaction(async trx => {
      const notebook = await this.repositories.notebooks.createNotebook(trx, {
        id,
        title,
        description,
        color,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageNotebook(trx, notebook);
      return notebook;
    });
  }

  async update(input: UpdateNotebookInput): Promise<Notebook> {
    const now = Date.now();
    const title = normalizeNotebookTitle(input.title);
    const description = normalizeNotebookDescription(input.description);
    const color = input.color;

    return this.repositories.withTransaction(async trx => {
      const notebook = assertNotebookExists(
        await this.repositories.notebooks.updateNotebook(trx, {
          id: input.id,
          title,
          description,
          color,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageNotebook(trx, notebook);
      return notebook;
    });
  }

  async remove(input: RemoveNotebookInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const notebook = assertNotebookExists(
        await this.repositories.notebooks.deleteNotebook(trx, {
          id: input.id,
          deletedAt: now,
        }),
        input.id
      );

      await this.stageNotebook(trx, notebook);
    });
  }

  private async stageNotebook(trx: Executor, notebook: Notebook) {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.notebooks, [
      { id: notebook.id, data: this.repositories.notebooks.toSyncData(notebook) },
    ]);
  }
}
