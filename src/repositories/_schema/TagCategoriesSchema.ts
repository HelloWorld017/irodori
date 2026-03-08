import { z } from 'zod';

export const tagCategorySyncDataSchema = z.object({
  version: z.int().gte(0),
  notebookId: z.string(),
  label: z.string(),
  icon: z.string().nullable(),
  color: z.string(),
  displayed: z.boolean(),
  sortOrder: z.number(),
  minSelect: z.number(),
  maxSelect: z.number().nullable(),
  required: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type TagCategorySyncData = z.output<typeof tagCategorySyncDataSchema>;
