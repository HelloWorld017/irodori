import { z } from 'zod';

export const notebookSyncDataSchema = z.object({
  version: z.int().gte(0),
  title: z.string(),
  description: z.string(),
  color: z.string(),
  sortOrder: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type NotebookSyncData = z.output<typeof notebookSyncDataSchema>;
