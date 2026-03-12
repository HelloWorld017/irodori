import { use, useMemo } from 'react';
import { Tag } from '@/fragments/_components/Tag';
import { isPromise } from '@/utils/promise';
import type { TagPluginProps } from '../_types/TagPluginProps';

type TagMarkupProps = {
  uuid: string;
  fetchTag: TagPluginProps['fetchTag'];
};

export const TagMarkup = ({ uuid, fetchTag }: TagMarkupProps) => {
  const result = useMemo(() => fetchTag(uuid), [uuid, fetchTag]);
  const tag = isPromise(result) ? use(result) : result;

  if (!tag) {
    return null;
  }

  return <Tag {...tag} />;
};
