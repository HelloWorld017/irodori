import { z } from 'zod';

export const tagSyncDataSchema = z.object({
  version: z.int().gte(0),
  categoryId: z.string(),
  label: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type TagSyncData = z.output<typeof tagSyncDataSchema>;
