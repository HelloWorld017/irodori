import type { ZodType } from 'zod';

export const parseSyncDataOrThrow = <TData>(
  schema: ZodType<TData>,
  entityName: string,
  id: string,
  data: unknown
): TData => {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new Error(`Invalid ${entityName} sync data: id=${id}`);
  }

  return parsed.data;
};
