import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Sticker, StickerKind, StickerViewItem } from '@/repositories/StickersRepository';

type CreateStickerInput = {
  kind: StickerKind;
  emoji?: string | null;
  label: string;
  assetId?: string | null;
};

type UpdateStickerInput = {
  id: string;
  kind: StickerKind;
  emoji: string | null;
  label: string;
  assetId: string | null;
};

type RemoveStickerInput = {
  id: string;
};

type FindOrCreateEmojiStickerInput = {
  emoji: string;
  label?: string;
};

const normalizeLabel = (value: string): string => {
  const label = value.trim();

  if (!label) {
    throw new Error('Sticker label is required.');
  }

  return label;
};

const normalizeEmoji = (value: string): string => {
  const emoji = value.trim();

  if (!emoji) {
    throw new Error('Sticker emoji is required.');
  }

  return emoji;
};

const assertStickerExists = (sticker: Sticker | null, id: string): Sticker => {
  if (!sticker) {
    throw new Error(`Sticker not found: id=${id}`);
  }

  return sticker;
};

export class StickersService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  list(): Promise<StickerViewItem[]> {
    return this.repositories.stickers.listStickers();
  }

  listByIds(ids: string[]): Promise<StickerViewItem[]> {
    return this.repositories.stickers.listStickersByIds(ids);
  }

  async getById(id: string): Promise<StickerViewItem | null> {
    const [sticker] = await this.repositories.stickers.listStickersByIds([id]);
    return sticker ?? null;
  }

  async create(input: CreateStickerInput): Promise<Sticker> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const label = normalizeLabel(input.label);

    return this.repositories.withTransaction(async trx => {
      const sticker = await this.repositories.stickers.createSticker(trx, {
        id,
        kind: input.kind,
        emoji: input.emoji ?? null,
        label,
        assetId: input.assetId ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageSticker(trx, sticker);
      return sticker;
    });
  }

  async update(input: UpdateStickerInput): Promise<Sticker> {
    const now = Date.now();
    const label = normalizeLabel(input.label);

    return this.repositories.withTransaction(async trx => {
      const sticker = assertStickerExists(
        await this.repositories.stickers.updateSticker(trx, {
          id: input.id,
          kind: input.kind,
          emoji: input.emoji,
          label,
          assetId: input.assetId,
          updatedAt: now,
        }),
        input.id
      );

      await this.stageSticker(trx, sticker);
      return sticker;
    });
  }

  async remove(input: RemoveStickerInput): Promise<void> {
    const now = Date.now();

    await this.repositories.withTransaction(async trx => {
      const sticker = assertStickerExists(
        await this.repositories.stickers.deleteSticker(trx, {
          id: input.id,
          deletedAt: now,
        }),
        input.id
      );

      await this.stageSticker(trx, sticker);
    });
  }

  async findOrCreateEmojiSticker(
    input: FindOrCreateEmojiStickerInput,
    executor?: Executor
  ): Promise<Sticker> {
    const emoji = normalizeEmoji(input.emoji);
    const label = normalizeLabel(input.label ?? emoji);

    const run = async (trx: Executor) => {
      const existingSticker = await this.repositories.stickers.readEmojiStickerByEmoji(emoji, trx);

      if (existingSticker) {
        return existingSticker;
      }

      const now = Date.now();
      const sticker = await this.repositories.stickers.createSticker(trx, {
        id: crypto.randomUUID(),
        kind: 'emoji',
        emoji,
        label,
        assetId: null,
        createdAt: now,
        updatedAt: now,
      });

      await this.stageSticker(trx, sticker);
      return sticker;
    };

    if (executor) {
      return run(executor);
    }

    return this.repositories.withTransaction(run);
  }

  private stageSticker(trx: Executor, sticker: Sticker): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.stickers, [
      {
        id: sticker.id,
        data: this.repositories.stickers.toSyncData(sticker),
      },
    ]);
  }
}
