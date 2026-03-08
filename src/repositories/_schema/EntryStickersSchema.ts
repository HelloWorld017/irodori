import { z } from 'zod';

export const entryStickerSyncDataSchema = z.object({
  version: z.int().gte(0),
  entryId: z.string(),
  slot: z.number(),
  stickerId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type EntryStickerSyncData = z.output<typeof entryStickerSyncDataSchema>;
