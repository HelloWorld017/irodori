import { decode as decodeBlurHash } from 'blurhash';
import { useLayoutEffect, useRef } from 'react';
import type { JSX } from 'react';

type BlurHashProps = { hash: string } & JSX.IntrinsicElements['canvas'];

export const BlurHash = ({ hash, ...props }: BlurHashProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useLayoutEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const { width, height } = canvasRef.current.getBoundingClientRect();
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const ctx = canvasRef.current.getContext('2d');
    const imageData = new ImageData(
      decodeBlurHash(hash, width, height) as Uint8ClampedArray<ArrayBuffer>,
      width,
      height
    );
    ctx?.putImageData(imageData, 0, 0);
  }, [hash]);

  return <canvas ref={canvasRef} {...props} />;
};
