import { MeshGradient } from '@mesh-gradient/react';
import { useMemo } from 'react';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { seededRandom } from '@/utils/random';
import { GRADIENT_COLORS } from '../_constants/gradient';
import type { EntryCoverAsset } from '@/repositories/EntriesRepository';
import type { ReactNode } from 'react';

export type EntryHeaderProps = {
  index: number;
  id: string;
  title: string;
  titleContent?: ReactNode;
  cover: EntryCoverAsset | null;
  leadingAction?: ReactNode;
  action?: ReactNode;
};

export const EntryHeader = ({
  index,
  id,
  title,
  titleContent,
  cover,
  leadingAction,
  action,
}: EntryHeaderProps) => {
  const random = useMemo(() => seededRandom(id), [id]);
  const gradientColors = useMemo(
    () => GRADIENT_COLORS[Math.floor(random * GRADIENT_COLORS.length)],
    [random]
  );

  return (
    <section className="relative overflow-hidden rounded-[2rem]">
      <div className="relative flex min-h-72 flex-col sm:min-h-88">
        {cover ? (
          <AssetImage
            asset={cover}
            alt={title || `#${index} cover`}
            className="absolute inset-0"
            fill="cover"
            loading="eager"
          />
        ) : (
          <MeshGradient
            className="absolute inset-0 h-full w-full"
            options={{
              colors: gradientColors as [string, string, string, string],
              seed: random,
              animationSpeed: 0.25,
            }}
          />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-transparent" />

        <div
          className="relative z-1 mx-auto flex w-full max-w-360 flex-1 flex-col justify-between p-6
            sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start">{leadingAction}</div>

            <div className="flex items-start justify-end gap-4">{action}</div>
          </div>
          <div className="max-w-3xl">
            <div className="mb-4 text-xl text-white/90">#{index}</div>
            {titleContent ?? (
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title || '제목 없는 일기'}
              </h1>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
