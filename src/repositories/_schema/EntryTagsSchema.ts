import { z } from 'zod';

export const entryTagSyncDataSchema = z.object({
  version: z.int().gte(0),
  entryId: z.string(),
  tagId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type EntryTagSyncData = z.output<typeof entryTagSyncDataSchema>;
