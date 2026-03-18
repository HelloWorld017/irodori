import { z } from 'zod';

export const entryFieldSyncDataSchema = z.object({
  version: z.int().gte(0),
  entryId: z.string(),
  fieldId: z.string(),
  value: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type EntryFieldSyncData = z.output<typeof entryFieldSyncDataSchema>;
