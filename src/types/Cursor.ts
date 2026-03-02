export type CursorValue = number | string;

export type SingleFieldCursor<
  TField extends string = string,
  TValue extends CursorValue = CursorValue,
> = {
  id: string;
} & Record<TField, TValue>;

export type CursorPageInput<TCursor> = {
  cursor?: TCursor;
  limit?: number;
};

export type CursorPageResult<TItem, TCursor> = {
  items: TItem[];
  nextCursor: TCursor | null;
};
