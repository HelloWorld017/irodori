import { decode as decodeBlurHash } from 'blurhash';
import { useLayoutEffect, useRef } from 'react';
import { BLURHASH_MAX_DIMENSION } from '@/constants/blurhash';
import type { JSX } from 'react';

type BlurHashProps = { hash: string } & JSX.IntrinsicElements['canvas'];

export const BlurHash = ({ hash, ...props }: BlurHashProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useLayoutEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const { width, height } = canvasRef.current.getBoundingClientRect();
    const scale = Math.min(1, BLURHASH_MAX_DIMENSION / Math.max(width, height, 1));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    canvasRef.current.width = targetWidth;
    canvasRef.current.height = targetHeight;

    const ctx = canvasRef.current.getContext('2d');
    const imageData = new ImageData(
      decodeBlurHash(hash, targetWidth, targetHeight) as Uint8ClampedArray<ArrayBuffer>,
      targetWidth,
      targetHeight
    );
    ctx?.putImageData(imageData, 0, 0);
  }, [hash]);

  return <canvas ref={canvasRef} {...props} />;
};
