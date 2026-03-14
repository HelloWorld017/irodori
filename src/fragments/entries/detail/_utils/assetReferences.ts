import { NAMESPACE } from '@/constants/common';

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export const ASSET_REFERENCE_URL_REGEX = new RegExp(
  `web\\+${NAMESPACE}_asset:(${UUID_PATTERN})`,
  'g'
);

export const ASSET_IMAGE_MARKUP_REGEX = new RegExp(
  `!\\[([^\\]\r\n]*)\\]\\(web\\+${NAMESPACE}_asset:(${UUID_PATTERN})\\)`,
  'g'
);
