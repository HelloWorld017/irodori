import { z } from 'zod';

export const entrySyncDataSchema = z.object({
  version: z.int().gte(0),
  notebookId: z.string(),
  title: z.string(),
  body: z.string(),
  coverAssetId: z.string().nullable(),
  index: z.number(),
  date: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type EntrySyncData = z.output<typeof entrySyncDataSchema>;
