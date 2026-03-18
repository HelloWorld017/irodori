import { z } from 'zod';

export const fieldKindSchema = z.enum(['string', 'location']);

export const fieldSyncDataSchema = z.object({
  version: z.int().gte(0),
  notebookId: z.string(),
  label: z.string(),
  kind: fieldKindSchema,
  sortOrder: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type FieldKind = z.output<typeof fieldKindSchema>;
export type FieldSyncData = z.output<typeof fieldSyncDataSchema>;
