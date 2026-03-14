import { decode as decodeBlurHash } from 'blurhash';
import { useCallback } from 'react';
import { BLURHASH_MAX_DIMENSION } from '@/constants/blurhash';
import type { RefCallback } from 'react';

export const useBlurHash = (hash: string | null) => {
  const canvasRef = useCallback<RefCallback<HTMLCanvasElement>>(
    canvas => {
      if (!canvas || !hash) {
        return;
      }

      const { width, height } = canvas.getBoundingClientRect();
      const scale = Math.min(1, BLURHASH_MAX_DIMENSION / Math.max(width, height, 1));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      const imageData = new ImageData(
        decodeBlurHash(hash, targetWidth, targetHeight) as Uint8ClampedArray<ArrayBuffer>,
        targetWidth,
        targetHeight
      );
      ctx?.putImageData(imageData, 0, 0);
    },
    [hash]
  );

  return canvasRef;
};
