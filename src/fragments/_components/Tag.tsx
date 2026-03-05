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
      `inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-tag-background)] px-2
      py-1 text-xs font-medium text-[var(--color-tag)] text-primary`,
      className
    )}
    style={{
      '--color-tag': color,
      '--color-tag-background': 'oklch(from var(--color-tag) 0.984 calc(c * 0.08) h)',
    }}
    title={label}
  >
    <span className="line-clamp-1">{label}</span>

    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 태그 삭제`}
        className="rounded-full p-0.5 text-tertiary transition hover:bg-elevated-background
          hover:text-primary"
      >
        <IconX className="text-[0.8rem]" />
      </button>
    )}
  </span>
);
