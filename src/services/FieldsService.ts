import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Field, FieldKind } from '@/repositories/FieldsRepository';

type CreateFieldInput = {
  notebookId: string;
  label: string;
  kind: FieldKind;
};

type UpdateFieldInput = {
  id: string;
  label: string;
  kind: FieldKind;
  sortOrder: number;
};

type RemoveFieldInput = {
  id: string;
};

const normalizeLabel = (value: string): string => {
  const label = value.trim();

  if (!label) {
    throw new Error('Field label is required.');
  }

  return label;
};

const assertFieldExists = (field: Field | null, id: string): Field => {
  if (!field) {
    throw new Error(`Field not found: id=${id}`);
  }

  return field;
};

export class FieldsService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  listByNotebookId(notebookId: string): Promise<Field[]> {
    return this.repositories.fields.listFieldsByNotebookId(notebookId);
  }

  async create(input: CreateFieldInput): Promise<Field> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const label = normalizeLabel(input.label);

    return this.repositories.withTransaction(async trx => {
      const field = await this.repositories.fields.createField(trx, {
        id,
        notebookId: input.notebookId,
        label,
        kind: input.kind,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageField(trx, field);
      return field;
    });
  }

  async update(input: UpdateFieldInput): Promise<Field> {
    const now = Date.now();
    const label = normalizeLabel(input.label);

    return this.repositories.withTransaction(async trx => {
      const field = assertFieldExists(
        await this.repositories.fields.updateField(trx, {
          id: input.id,
          label,
          kind: input.kind,
          sortOrder: input.sortOrder,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageField(trx, field);
      return field;
    });
  }

  async remove(input: RemoveFieldInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const field = assertFieldExists(
        await this.repositories.fields.deleteField(trx, {
          id: input.id,
          deletedAt: now,
        }),
        input.id
      );

      await this.stageField(trx, field);
    });
  }

  private stageField(trx: Executor, field: Field): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.fields, [
      {
        id: field.id,
        data: this.repositories.fields.toSyncData(field),
      },
    ]);
  }
}
