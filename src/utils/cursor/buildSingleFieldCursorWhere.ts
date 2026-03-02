import type { CursorValue, SingleFieldCursor } from '@/types/Cursor';

export type CursorSortDirection = 'asc' | 'desc';
export type CursorCompareOperator = '<' | '>';

export type SingleFieldCursorWhere<TValue> = {
  fieldValue: TValue;
  id: string;
  fieldOperator: CursorCompareOperator;
  idOperator: CursorCompareOperator;
};

export const buildSingleFieldCursorWhere = <TField extends string, TValue extends CursorValue>(
  cursor: SingleFieldCursor<TField, TValue> | undefined,
  field: TField,
  direction: CursorSortDirection
): SingleFieldCursorWhere<TValue> | null => {
  if (!cursor) {
    return null;
  }

  const operator: CursorCompareOperator = direction === 'desc' ? '<' : '>';

  return {
    fieldValue: cursor[field],
    id: cursor.id,
    fieldOperator: operator,
    idOperator: operator,
  };
};
