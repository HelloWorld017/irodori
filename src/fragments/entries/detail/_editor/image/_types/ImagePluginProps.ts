import type { EditorPortal } from '../../_providers/EditorPortalProvider';
import type { Asset } from '@/repositories/AssetsRepository';

export type ImagePluginProps = {
  portal: EditorPortal;
  fetchAsset: (assetId: string) => Asset | null | Promise<Asset | null>;
};
