import type { RouteKind } from '../route';

export const queryKey = (route: RouteKind, action: string, params?: unknown) => [
  route,
  action,
  params,
];
