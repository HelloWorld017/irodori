import { z } from 'zod';

export const entryLocationSyncDataSchema = z.object({
  version: z.int().gte(0),
  entryId: z.string(),
  fieldId: z.string(),
  lat: z.number(),
  lng: z.number(),
  name: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type EntryLocationSyncData = z.output<typeof entryLocationSyncDataSchema>;
