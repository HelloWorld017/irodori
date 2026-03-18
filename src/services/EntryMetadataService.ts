import { toEntryFieldEntityId } from '@/repositories/EntryFieldsRepository';
import { toEntryLocationEntityId } from '@/repositories/EntryLocationsRepository';
import { toEntryStickerEntityId } from '@/repositories/EntryStickersRepository';
import { toEntryTagEntityId } from '@/repositories/EntryTagsRepository';
import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { EntryDraftField, EntryDraftSticker } from '@/repositories/EntryDraftsRepository';
import type { EntryField } from '@/repositories/EntryFieldsRepository';
import type { EntryLocation } from '@/repositories/EntryLocationsRepository';
import type { EntrySticker } from '@/repositories/EntryStickersRepository';
import type { EntryTag } from '@/repositories/EntryTagsRepository';
import type { Field } from '@/repositories/FieldsRepository';
import type { StickerViewItem } from '@/repositories/StickersRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';

type PublishDraftInput = {
  entryId: string;
  notebookId: string;
  tagIds: string[];
  fields: EntryDraftField[];
  stickers: EntryDraftSticker[];
  now: number;
};

export type EntryMetadataLocation = {
  lat: number;
  lng: number;
  name: string | null;
};

export type EntryMetadataSticker = {
  slot: number;
  sticker: StickerViewItem;
};

export type EntryMetadataField = {
  field: Field;
  value: string | null;
  location: EntryMetadataLocation | null;
};

export type EntryMetadata = {
  tags: TagViewItem[];
  fields: EntryMetadataField[];
  stickers: EntryMetadataSticker[];
};

const toUniqueValues = <T>(values: T[]): T[] => [...new Set(values)];

export class EntryMetadataService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  async getByEntryId(entryId: string): Promise<EntryMetadata> {
    const [entryTags, entryStickers, entryFields] = await Promise.all([
      this.repositories.entryTags.listEntryTagsByEntryId(entryId),
      this.repositories.entryStickers.listEntryStickersByEntryId(entryId),
      this.repositories.entryFields.listEntryFieldsByEntryId(entryId),
    ]);

    const tagIds = toUniqueValues(entryTags.map(entryTag => entryTag.tagId));
    const fieldIds = toUniqueValues(entryFields.map(entryField => entryField.fieldId));
    const stickerIds = toUniqueValues(entryStickers.map(entrySticker => entrySticker.stickerId));

    const [tags, fields, entryLocations, stickers] = await Promise.all([
      this.repositories.tags.listTagsByIds(tagIds),
      this.repositories.fields.listFieldsByIds(fieldIds),
      Promise.all(
        fieldIds.map(fieldId =>
          this.repositories.entryLocations.readEntryLocation(entryId, fieldId)
        )
      ),
      this.repositories.stickers.listStickersByIds(stickerIds),
    ]);

    const entryFieldsByFieldId = new Map(
      entryFields.map(entryField => [entryField.fieldId, entryField])
    );
    const fieldsById = new Map(fields.map(field => [field.id, field]));
    const entryLocationsByFieldId = new Map(
      entryLocations
        .filter((entryLocation): entryLocation is EntryLocation => entryLocation !== null)
        .map(entryLocation => [entryLocation.fieldId, entryLocation])
    );
    const tagsById = new Map(tags.map(tag => [tag.id, tag]));
    const stickersById = new Map(stickers.map(sticker => [sticker.id, sticker]));

    return {
      tags: entryTags
        .map(entryTag => tagsById.get(entryTag.tagId))
        .filter(tag => tag !== undefined),
      fields: fieldIds
        .map(fieldId => {
          const field = fieldsById.get(fieldId);

          if (!field) {
            return null;
          }

          const entryField = entryFieldsByFieldId.get(fieldId);
          const entryLocation = entryLocationsByFieldId.get(fieldId);

          return {
            field,
            value: entryField?.value ?? null,
            location: entryLocation
              ? {
                  lat: entryLocation.lat,
                  lng: entryLocation.lng,
                  name: entryLocation.name,
                }
              : null,
          };
        })
        .filter(entryField => entryField !== null),
      stickers: entryStickers
        .map(entrySticker => {
          const sticker = stickersById.get(entrySticker.stickerId);

          if (!sticker) {
            return null;
          }

          return {
            slot: entrySticker.slot,
            sticker,
          };
        })
        .filter(entrySticker => entrySticker !== null),
    };
  }

  async publishDraft(trx: Executor, input: PublishDraftInput): Promise<void> {
    await this.publishTags(trx, input.entryId, input.tagIds, input.now);
    await this.publishFields(trx, input.entryId, input.notebookId, input.fields, input.now);
    await this.publishStickers(trx, input.entryId, input.stickers, input.now);
  }

  private stageEntryFields(trx: Executor, entryFields: EntryField[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryFields,
      entryFields.map(entryField => ({
        id: toEntryFieldEntityId(entryField.entryId, entryField.fieldId),
        data: this.repositories.entryFields.toSyncData(entryField),
      }))
    );
  }

  private stageEntryLocations(trx: Executor, entryLocations: EntryLocation[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryLocations,
      entryLocations.map(entryLocation => ({
        id: toEntryLocationEntityId(entryLocation.entryId, entryLocation.fieldId),
        data: this.repositories.entryLocations.toSyncData(entryLocation),
      }))
    );
  }

  private stageEntryTags(trx: Executor, entryTags: EntryTag[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryTags,
      entryTags.map(entryTag => ({
        id: toEntryTagEntityId(entryTag.entryId, entryTag.tagId),
        data: this.repositories.entryTags.toSyncData(entryTag),
      }))
    );
  }

  private stageEntryStickers(trx: Executor, entryStickers: EntrySticker[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryStickers,
      entryStickers.map(entrySticker => ({
        id: toEntryStickerEntityId(entrySticker.entryId, entrySticker.slot),
        data: this.repositories.entryStickers.toSyncData(entrySticker),
      }))
    );
  }

  private async publishTags(
    trx: Executor,
    entryId: string,
    tagIds: string[],
    now: number
  ): Promise<void> {
    const nextTagIds = toUniqueValues(tagIds);
    const currentEntryTags = await this.repositories.entryTags.listEntryTagsByEntryId(entryId, trx);
    const currentTagIds = new Set(currentEntryTags.map(entryTag => entryTag.tagId));
    const nextTagIdSet = new Set(nextTagIds);
    const changedEntryTags: EntryTag[] = [];

    for (const tagId of nextTagIds) {
      if (currentTagIds.has(tagId)) {
        continue;
      }

      const entryTag = await this.repositories.entryTags.upsertEntryTag(trx, {
        entryId,
        tagId,
        createdAt: now,
        updatedAt: now,
      });

      changedEntryTags.push(entryTag);
    }

    for (const entryTag of currentEntryTags) {
      if (nextTagIdSet.has(entryTag.tagId)) {
        continue;
      }

      const deletedEntryTag = await this.repositories.entryTags.deleteEntryTag(trx, {
        entryId,
        tagId: entryTag.tagId,
        deletedAt: now,
      });

      if (deletedEntryTag) {
        changedEntryTags.push(deletedEntryTag);
      }
    }

    if (changedEntryTags.length > 0) {
      await this.stageEntryTags(trx, changedEntryTags);
    }
  }

  private async publishFields(
    trx: Executor,
    entryId: string,
    notebookId: string,
    fields: EntryDraftField[],
    now: number
  ): Promise<void> {
    const nextFields = new Map(fields.map(field => [field.fieldId, field] as const));
    const nextFieldIds = [...nextFields.keys()];
    const availableFields = await this.repositories.fields.listFieldsByIds(nextFieldIds, trx);
    const availableFieldsById = new Map(availableFields.map(field => [field.id, field]));

    for (const fieldId of nextFieldIds) {
      const field = availableFieldsById.get(fieldId);

      if (!field) {
        throw new Error(`Field not found: id=${fieldId}`);
      }

      if (field.notebookId !== notebookId) {
        throw new Error(`Field does not belong to notebook: fieldId=${fieldId}`);
      }
    }

    const currentEntryFields = await this.repositories.entryFields.listEntryFieldsByEntryId(
      entryId,
      trx
    );
    const currentEntryFieldsByFieldId = new Map(
      currentEntryFields.map(entryField => [entryField.fieldId, entryField])
    );
    const currentEntryLocationsByFieldId = new Map(
      (
        await Promise.all(
          toUniqueValues([...currentEntryFieldsByFieldId.keys(), ...nextFieldIds]).map(fieldId =>
            this.repositories.entryLocations.readEntryLocation(entryId, fieldId, trx)
          )
        )
      )
        .filter((entryLocation): entryLocation is EntryLocation => entryLocation !== null)
        .map(entryLocation => [entryLocation.fieldId, entryLocation])
    );
    const changedEntryFields: EntryField[] = [];
    const changedEntryLocations: EntryLocation[] = [];

    for (const [fieldId, draftField] of nextFields) {
      const field = availableFieldsById.get(fieldId);
      const currentEntryField = currentEntryFieldsByFieldId.get(fieldId);
      const currentEntryLocation = currentEntryLocationsByFieldId.get(fieldId);

      if (!field) {
        continue;
      }

      if (field.kind === 'string') {
        if (draftField.value === null) {
          if (currentEntryLocation) {
            const deletedEntryLocation = await this.repositories.entryLocations.deleteEntryLocation(
              trx,
              {
                entryId,
                fieldId,
                deletedAt: now,
              }
            );

            if (deletedEntryLocation) {
              changedEntryLocations.push(deletedEntryLocation);
            }
          }

          if (currentEntryField) {
            const deletedEntryField = await this.repositories.entryFields.deleteEntryField(trx, {
              entryId,
              fieldId,
              deletedAt: now,
            });

            if (deletedEntryField) {
              changedEntryFields.push(deletedEntryField);
            }
          }

          continue;
        }

        if (currentEntryLocation) {
          const deletedEntryLocation = await this.repositories.entryLocations.deleteEntryLocation(
            trx,
            {
              entryId,
              fieldId,
              deletedAt: now,
            }
          );

          if (deletedEntryLocation) {
            changedEntryLocations.push(deletedEntryLocation);
          }
        }

        if (currentEntryField?.value !== draftField.value) {
          const nextEntryField = await this.repositories.entryFields.upsertEntryField(trx, {
            entryId,
            fieldId,
            value: draftField.value,
            createdAt: currentEntryField?.createdAt ?? now,
            updatedAt: now,
          });

          changedEntryFields.push(nextEntryField);
        }

        continue;
      }

      if (draftField.location === null) {
        if (currentEntryLocation) {
          const deletedEntryLocation = await this.repositories.entryLocations.deleteEntryLocation(
            trx,
            {
              entryId,
              fieldId,
              deletedAt: now,
            }
          );

          if (deletedEntryLocation) {
            changedEntryLocations.push(deletedEntryLocation);
          }
        }

        if (currentEntryField) {
          const deletedEntryField = await this.repositories.entryFields.deleteEntryField(trx, {
            entryId,
            fieldId,
            deletedAt: now,
          });

          if (deletedEntryField) {
            changedEntryFields.push(deletedEntryField);
          }
        }

        continue;
      }

      if (currentEntryField?.value !== null || !currentEntryField) {
        const nextEntryField = await this.repositories.entryFields.upsertEntryField(trx, {
          entryId,
          fieldId,
          value: null,
          createdAt: currentEntryField?.createdAt ?? now,
          updatedAt: now,
        });

        changedEntryFields.push(nextEntryField);
      }

      if (
        currentEntryLocation?.lat !== draftField.location.lat ||
        currentEntryLocation?.lng !== draftField.location.lng ||
        currentEntryLocation?.name !== draftField.location.name ||
        !currentEntryLocation
      ) {
        const nextEntryLocation = await this.repositories.entryLocations.upsertEntryLocation(trx, {
          entryId,
          fieldId,
          lat: draftField.location.lat,
          lng: draftField.location.lng,
          name: draftField.location.name,
          createdAt: currentEntryLocation?.createdAt ?? now,
          updatedAt: now,
        });

        changedEntryLocations.push(nextEntryLocation);
      }
    }

    for (const [fieldId] of currentEntryFieldsByFieldId) {
      if (nextFields.has(fieldId)) {
        continue;
      }

      const deletedEntryField = await this.repositories.entryFields.deleteEntryField(trx, {
        entryId,
        fieldId,
        deletedAt: now,
      });

      if (deletedEntryField) {
        changedEntryFields.push(deletedEntryField);
      }

      const deletedEntryLocation = await this.repositories.entryLocations.deleteEntryLocation(trx, {
        entryId,
        fieldId,
        deletedAt: now,
      });

      if (deletedEntryLocation) {
        changedEntryLocations.push(deletedEntryLocation);
      }
    }

    if (changedEntryFields.length > 0) {
      await this.stageEntryFields(trx, changedEntryFields);
    }

    if (changedEntryLocations.length > 0) {
      await this.stageEntryLocations(trx, changedEntryLocations);
    }
  }

  private async publishStickers(
    trx: Executor,
    entryId: string,
    stickers: EntryDraftSticker[],
    now: number
  ): Promise<void> {
    const currentEntryStickers = await this.repositories.entryStickers.listEntryStickersByEntryId(
      entryId,
      trx
    );
    const currentEntryStickersBySlot = new Map(
      currentEntryStickers.map(entrySticker => [entrySticker.slot, entrySticker])
    );
    const changedEntryStickers: EntrySticker[] = [];

    for (const draftSticker of stickers) {
      const currentEntrySticker = currentEntryStickersBySlot.get(draftSticker.slot);

      if (currentEntrySticker?.stickerId === draftSticker.stickerId) {
        currentEntryStickersBySlot.delete(draftSticker.slot);
        continue;
      }

      const nextEntrySticker = await this.repositories.entryStickers.upsertEntrySticker(trx, {
        entryId,
        slot: draftSticker.slot,
        stickerId: draftSticker.stickerId,
        createdAt: currentEntrySticker?.createdAt ?? now,
        updatedAt: now,
      });

      changedEntryStickers.push(nextEntrySticker);
      currentEntryStickersBySlot.delete(draftSticker.slot);
    }

    for (const entrySticker of currentEntryStickersBySlot.values()) {
      const deletedEntrySticker = await this.repositories.entryStickers.deleteEntrySticker(trx, {
        entryId,
        slot: entrySticker.slot,
        deletedAt: now,
      });

      if (deletedEntrySticker) {
        changedEntryStickers.push(deletedEntrySticker);
      }
    }

    if (changedEntryStickers.length > 0) {
      await this.stageEntryStickers(trx, changedEntryStickers);
    }
  }
}
