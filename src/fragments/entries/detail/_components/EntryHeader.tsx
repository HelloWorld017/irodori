import { MeshGradient } from '@mesh-gradient/react';
import { useMemo } from 'react';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { murmurhash2 } from '@/utils/random';
import { GRADIENT_COLORS } from '../_constants/gradient';
import type { EntryDetailItem } from '@/services/EntriesService';
import type { ReactNode } from 'react';

export type EntryHeaderProps = {
  index: number;
  id: string;
  title: string;
  cover: EntryDetailItem['coverAsset'];
  titleContent?: ReactNode;
  coverAction?: ReactNode;
  action?: ReactNode;
};

export const EntryHeader = ({
  index,
  id,
  title,
  cover,
  titleContent,
  coverAction,
  action,
}: EntryHeaderProps) => {
  const gradientColors = useMemo(
    () => GRADIENT_COLORS[murmurhash2(id) % GRADIENT_COLORS.length],
    [id]
  );

  return (
    <section className="relative overflow-hidden rounded-[2rem]">
      <div className="relative min-h-72 sm:min-h-88">
        {cover ? (
          <AssetImage
            blobDigest={cover.blobDigest}
            blurhash={cover.blurhash}
            alt={title || `#${index} cover`}
            className="absolute inset-0 h-full w-full"
            imageClassName="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <MeshGradient
            className="absolute inset-0 h-full w-full"
            options={{
              colors: [...gradientColors] as [string, string, string, string],
              seed: murmurhash2(id),
              animationSpeed: 0.25,
            }}
          />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        <div className="relative z-1 flex min-h-72 flex-col justify-between p-6 sm:min-h-88 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <span
              className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-sm
                font-medium text-white/90 backdrop-blur-md"
            >
              #{index}
            </span>
            <div className="flex items-center gap-2">
              {coverAction}
              {action}
            </div>
          </div>

          <div className="max-w-3xl">
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
