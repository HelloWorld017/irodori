import { z } from 'zod';

export const entryDraftCoverSchema = z.object({
  id: z.string(),
  blobDigest: z.string(),
  blurhash: z.string().nullable(),
  mime: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export const entryDraftStickerSchema = z.object({
  slot: z.number().int(),
  stickerId: z.string(),
});

export const entryDraftDataSchema = z.object({
  title: z.string(),
  body: z.string(),
  date: z.number(),
  cover: entryDraftCoverSchema.nullable(),
  tagIds: z.array(z.string()),
  stickers: z.array(entryDraftStickerSchema),
  excludedTagIds: z.array(z.string()),
});

export type EntryDraftCover = z.output<typeof entryDraftCoverSchema>;
export type EntryDraftSticker = z.output<typeof entryDraftStickerSchema>;
export type EntryDraftData = z.output<typeof entryDraftDataSchema>;
