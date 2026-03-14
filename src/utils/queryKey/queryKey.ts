import { stableJSONSerialize } from '../json';
import type { RouteKind } from '../route';

export type QueryRouteKind = 'common' | Exclude<RouteKind, 'entriesEdit'>;

export type QueryActions = {
  common: {
    'assets': void;
    'emoji': void;
    'sticker-picker-list': void;
    'sticker-picker-selected': string | null | undefined;
    'search-tag-categories': string | null;
    'search-tags': {
      notebookId: string;
      categoryId: string | null;
      query: string;
      limit: number;
    };
  };
  onboarding: Record<never, never>;
  shelf: {
    'notebooks': void;
    'notebook-edit-tag-categories': string;
    'notebook-edit-category-tags': {
      notebookId: string;
      categoryId: string;
    };
  };
  entries: {
    notebook: string;
    count: string;
    list: {
      notebookId: string;
      searchText: string | null | undefined;
      tagIds: string[] | undefined;
      dateBefore: number | null | undefined;
    };
  };
  entriesDetail: {
    'assets': string;
    'detail': string;
    'detail-asset': string;
    'detail-tag': string;
    'draft': string;
  };
};

type QueryActionParams<
  TRoute extends QueryRouteKind,
  TAction extends keyof QueryActions[TRoute],
> = QueryActions[TRoute][TAction];

export type BatchActions = {
  common: {
    assets: void;
    tags: void;
  };
  onboarding: Record<never, never>;
  shelf: Record<never, never>;
  entries: Record<never, never>;
  entriesDetail: Record<never, never>;
};

type BatchActionParams<
  TRoute extends QueryRouteKind,
  TAction extends keyof BatchActions[TRoute],
> = BatchActions[TRoute][TAction];

export const queryKey = <TRoute extends QueryRouteKind, TAction extends keyof QueryActions[TRoute]>(
  route: TRoute,
  action: TAction,
  ...[params]: void extends QueryActionParams<TRoute, TAction>
    ? [params?: QueryActionParams<TRoute, TAction>]
    : [params: QueryActionParams<TRoute, TAction> | typeof anyParams]
) => (params === anyParams ? ([route, action] as const) : ([route, action, params] as const));

export const batchKey = <TRoute extends QueryRouteKind, TAction extends keyof BatchActions[TRoute]>(
  route: TRoute,
  action: TAction,
  ...[params]: void extends BatchActionParams<TRoute, TAction>
    ? [params?: BatchActionParams<TRoute, TAction>]
    : [params: BatchActionParams<TRoute, TAction>]
) => stableJSONSerialize([route, action, params]);

export const anyParams = Symbol.for('queryKey.anyParams');
