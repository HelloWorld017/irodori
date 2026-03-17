import { MeshGradient as CoreMeshGradient } from '@mesh-gradient/core';
import { useEffectEvent, useLayoutEffect, useRef } from 'react';
import type {
  MeshGradientInitOptions,
  MeshGradientOptions,
  MeshGradientUpdateOptions,
} from '@mesh-gradient/core';
import type { HTMLAttributes } from 'react';

const unsafeGetAnimate = (instance: CoreMeshGradient) => {
  type InternalMeshGradient = Pick<CoreMeshGradient, keyof CoreMeshGradient>;
  const internalInstance: InternalMeshGradient = instance;
  const internalInstanceWithAnimate = internalInstance as InternalMeshGradient & {
    animate: () => void;
  };

  return () => internalInstanceWithAnimate.animate();
};

export interface MeshGradientProps extends HTMLAttributes<HTMLCanvasElement> {
  options?: MeshGradientOptions & MeshGradientInitOptions & MeshGradientUpdateOptions;
  isPaused?: boolean;
  onInit?: (instance: CoreMeshGradient) => void;
  onUpdate?: (instance: CoreMeshGradient) => void;
}

export const MeshGradient = (props: MeshGradientProps) => {
  const { options, isPaused, onInit, onUpdate, ...canvasProps } = props;
  const instanceRef = useRef<CoreMeshGradient | null>(null);
  useLayoutEffect(() => {
    const gradient = new CoreMeshGradient();
    instanceRef.current = gradient;

    return () => {
      gradient.destroy();
      instanceRef.current = null;
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevOptionsIdRef = useRef<string | null>(null);

  const onInitEvent = useEffectEvent(onInit ?? (() => {}));
  const onUpdateEvent = useEffectEvent(onUpdate ?? (() => {}));
  useLayoutEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !canvasRef.current || prevOptionsIdRef.current) {
      return;
    }

    instance.init(canvasRef.current, options);
    onInitEvent(instance);
    prevOptionsIdRef.current = JSON.stringify(options);
  }, [options]);

  useLayoutEffect(() => {
    const instance = instanceRef.current;
    if (
      !instance ||
      !instance.isInitialized ||
      prevOptionsIdRef.current === JSON.stringify(options)
    ) {
      return;
    }

    instance.update(options);
    onUpdateEvent(instance);
    prevOptionsIdRef.current = JSON.stringify(options);
  }, [options]);

  useLayoutEffect(() => {
    const instance = instanceRef.current;
    if (!instance) {
      return;
    }

    if (isPaused) {
      instance.pause();
      return;
    }

    if (instance.isInitialized) {
      instance.play();

      const animate = unsafeGetAnimate(instance);
      animate();
    }
  }, [isPaused]);

  return <canvas ref={canvasRef} {...canvasProps} />;
};
