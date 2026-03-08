import { z } from 'zod';

export const entryAssetSyncDataSchema = z.object({
  version: z.int().gte(0),
  entryId: z.string(),
  assetId: z.string(),
  usage: z.enum(['cover', 'inline']),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type EntryAssetSyncData = z.output<typeof entryAssetSyncDataSchema>;
