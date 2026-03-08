import { z } from 'zod';

export const assetSyncDataSchema = z.object({
  version: z.int().gte(0),
  blobDigest: z.string(),
  blurhash: z.string().nullable(),
  mime: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  status: z.enum(['pending', 'uploaded', 'failed']),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type AssetSyncData = z.output<typeof assetSyncDataSchema>;
