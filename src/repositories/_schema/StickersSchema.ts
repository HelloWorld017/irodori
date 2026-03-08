import { z } from 'zod';

export const stickerSyncDataSchema = z.object({
  version: z.int().gte(0),
  kind: z.enum(['emoji', 'custom']),
  emoji: z.string().nullable(),
  label: z.string(),
  assetId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type StickerSyncData = z.output<typeof stickerSyncDataSchema>;
