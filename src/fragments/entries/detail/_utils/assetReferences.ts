import { NAMESPACE } from '@/constants/common';

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const ASSET_REFERENCE_ID_REGEX = new RegExp(`^${UUID_PATTERN}$`, 'i');

export const ASSET_REFERENCE_URL_REGEX = new RegExp(
  `web\\+${NAMESPACE}_asset:(${UUID_PATTERN})`,
  'g'
);

export const ASSET_IMAGE_MARKUP_REGEX = new RegExp(
  `!\\[([^\\]\r\n]*)\\]\\(web\\+${NAMESPACE}_asset:(${UUID_PATTERN})\\)`,
  'g'
);

export const isAssetReferenceId = (value: string): boolean => ASSET_REFERENCE_ID_REGEX.test(value);
export const extractAssetReferenceIds = (value: string): string[] => {
  const assetIds = new Set<string>();

  for (const match of value.matchAll(new RegExp(ASSET_REFERENCE_URL_REGEX.source, 'gi'))) {
    const assetId = match[1]?.trim();

    if (!assetId || !isAssetReferenceId(assetId)) {
      continue;
    }

    assetIds.add(assetId);
  }

  return [...assetIds];
};

export const toAssetImageReference = (assetId: string, alt = ''): string =>
  `![${alt}](web+${NAMESPACE}_asset:${assetId})`;
