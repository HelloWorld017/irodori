import type { CursorValue, SingleFieldCursor } from '@/types/Cursor';
import type { ExpressionBuilder, ExpressionWrapper, SqlBool } from 'kysely';

export type CursorSortDirection = 'asc' | 'desc';
export type CursorCompareOperator = '<' | '>';

export type SingleFieldCursorWhere<TField extends string, TValue extends CursorValue> = <
  TTable extends string,
  TDatabase extends { [TTableKey in TTable]: { id: string } & { [TFieldKey in TField]: TValue } },
>(
  eb: ExpressionBuilder<TDatabase, TTable>
) => ExpressionWrapper<TDatabase, TTable, SqlBool>;

export const buildSingleFieldCursorWhere = <TField extends string, TValue extends CursorValue>(
  cursor: SingleFieldCursor<TField, TValue> | undefined,
  field: TField,
  direction: CursorSortDirection
): SingleFieldCursorWhere<TField, TValue> | null => {
  if (!cursor) {
    return null;
  }

  const operator: CursorCompareOperator = direction === 'desc' ? '<' : '>';
  const fieldValue = cursor[field];
  const id = cursor.id;

  return eb =>
    eb.or([
      eb(field, operator, fieldValue as never),
      eb.and([eb(field, '=', fieldValue as never), eb('id', operator, id as never)]),
    ]);
};
