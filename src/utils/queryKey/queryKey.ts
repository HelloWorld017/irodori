import { stableJSONSerialize } from '../json';
import type { RouteKind } from '../route';

export type QueryRouteKind = 'common' | Exclude<RouteKind, 'entriesEdit'>;

export type QueryActions = {
  common: {
    'emoji': void;
    'sticker-picker-list': void;
    'sticker-picker-selected': string | null | undefined;
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
    'notebook': string;
    'count': string;
    'list': {
      notebookId: string;
      searchText: string | null | undefined;
      tagIds: string[] | undefined;
      dateBefore: number | null | undefined;
    };
    'detail': string;
    'draft': string;
    'detail-tag': string;
    'search-tag-categories': string | null;
    'search-tags': {
      notebookId: string;
      categoryId: string | null;
      query: string;
      limit: number;
    };
  };
  entriesDetail: {
    tags: void;
  };
};

type QueryActionParams<
  TRoute extends QueryRouteKind,
  TAction extends keyof QueryActions[TRoute],
> = QueryActions[TRoute][TAction];

export const queryKey = <TRoute extends QueryRouteKind, TAction extends keyof QueryActions[TRoute]>(
  route: TRoute,
  action: TAction,
  ...[params]: void extends QueryActionParams<TRoute, TAction>
    ? [params?: QueryActionParams<TRoute, TAction>]
    : [params: QueryActionParams<TRoute, TAction> | typeof anyParams]
) => (params === anyParams ? ([route, action] as const) : ([route, action, params] as const));

export const batchKey = <TRoute extends QueryRouteKind, TAction extends keyof QueryActions[TRoute]>(
  route: TRoute,
  action: TAction,
  ...[params]: void extends QueryActionParams<TRoute, TAction>
    ? [params?: QueryActionParams<TRoute, TAction>]
    : [params: QueryActionParams<TRoute, TAction>]
) => stableJSONSerialize([route, action, params]);

export const anyParams = Symbol.for('irodori.queryKey.anyParams');
