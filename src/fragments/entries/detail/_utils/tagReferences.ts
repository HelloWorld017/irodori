export const TAG_REFERENCE_CONTENT_REGEX = /\[\[([^\r\n\\\]]+)\]\]/g;
export const TAG_REFERENCE_INPUT_REGEX = /\[\[([^\r\n\\\]]*)\]?\]?$/;
export const TAG_REFERENCE_ID_REGEX =
  /\[\[([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\]\]/g;

export const isTagReferenceId = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const extractTagReferenceIds = (value: string): string[] => {
  const tagIds = new Set<string>();

  for (const match of value.matchAll(TAG_REFERENCE_CONTENT_REGEX)) {
    const tagId = match[1]?.trim();

    if (!tagId || !isTagReferenceId(tagId)) {
      continue;
    }

    tagIds.add(tagId);
  }

  return [...tagIds];
};

export const toTagReference = (tagId: string): string => `[[${tagId}]]`;
