import { useParams } from 'wouter';
import type { RouteKind, RouteParams } from '@/utils/route';

export const useRouteParams = <TKind extends RouteKind>() => useParams<RouteParams[TKind]>();
