import { Link } from 'wouter';

type NotebookThumbnailProps = {
  title: string;
  color: string;
  link?: string;
};

export const NotebookThumbnail = ({ title, color, link }: NotebookThumbnailProps) => {
  const Root = link ? Link : 'div';
  return (
    <Root
      href={link as string}
      className="relative flex aspect-[3/4] w-28 flex-col overflow-hidden rounded-xl text-left
        md:w-36"
      style={{ backgroundColor: `oklch(from ${color} calc(l * 0.8) calc(c * 0.3) h)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent
          to-black/8"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/8
          to-transparent"
      />

      <div
        className="pointer-events-none absolute inset-y-0 left-3 w-1 bg-gradient-to-r from-white/8
          via-transparent to-black/3"
      />

      <div className="relative flex h-full flex-col p-4 pl-6 md:p-5 md:pl-7">
        <div
          className="line-clamp-2 text-base leading-snug font-semibold wrap-break-word text-white
            md:text-lg"
        >
          {title}
        </div>
        <div className="mt-4 h-1 w-6 bg-white" />
      </div>
    </Root>
  );
};
