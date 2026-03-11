import { use } from 'react';
import { Tag } from '@/fragments/_components/Tag';
import type { TagPluginProps } from './types';

const isPromise = <T,>(value: T | Promise<T>): value is Promise<T> =>
  typeof value === 'object' && value !== null && 'then' in value;

type TagMarkupProps = {
  uuid: string;
  fetchTag: TagPluginProps['fetchTag'];
};

export const TagMarkup = ({ uuid, fetchTag }: TagMarkupProps) => {
  const result = fetchTag(uuid);
  const tag = isPromise(result) ? use(result) : result;

  if (!tag) {
    return null;
  }

  return <Tag {...tag} />;
};
