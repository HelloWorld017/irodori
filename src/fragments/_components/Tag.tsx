import { IconX } from '@/fragments/_icons';
import { classes } from '@/utils/classes';

type TagProps = {
  label: string;
  color?: string;
  className?: string;
  onRemove?: () => void;
};

export const Tag = ({ label, color, className, onRemove }: TagProps) => (
  <span
    className={classes(
      `inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-base-background
      px-2 py-1 text-xs font-medium text-primary`,
      className
    )}
  >
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? 'var(--color-tertiary)' }}
    />
    <span className="line-clamp-1">{label}</span>

    {onRemove ? (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 태그 삭제`}
        className="rounded-full p-0.5 text-tertiary transition hover:bg-elevated-background
          hover:text-primary"
      >
        <IconX className="text-[0.8rem]" />
      </button>
    ) : null}
  </span>
);
