import { DynamicIcon, IconX } from '@/fragments/_icons';
import { classes } from '@/utils/classes';

type TagProps = {
  label: string;
  color?: string;
  icon?: string | null;
  className?: string;
  onRemove?: () => void;
};

export const Tag = ({ label, color, icon, className, onRemove }: TagProps) => (
  <span
    className={classes(
      `inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-tag-background)] px-2
      py-1 text-sm font-medium text-[var(--color-tag-foreground)]`,
      className
    )}
    style={{
      '--color-tag': color,
      '--color-tag-foreground': 'oklch(from var(--color-tag) 0.56 c h)',
      '--color-tag-background': 'oklch(from var(--color-tag) 0.984 calc(c * 0.08) h)',
      '--color-tag-elevated-background':
        'color-mix(in oklab, var(--color-tag-background) 50%, white 50%)',
      '--color-tag-tertiary': 'color-mix(in oklab, var(--color-tag-foreground), transparent 50%)',
    }}
    title={label}
  >
    {icon && <DynamicIcon name={icon} />}
    <span className="line-clamp-1">{label}</span>

    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 태그 삭제`}
        className="rounded-full p-0.5 text-[var(--color-tag-tertiary)] transition
          hover:bg-[var(--color-tag-elevated-background)] hover:text-[var(--color-tag-foreground)]"
      >
        <IconX className="text-[0.8rem]" />
      </button>
    )}
  </span>
);
