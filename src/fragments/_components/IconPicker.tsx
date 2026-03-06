type IconPickerProps = {
  value: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

export const IconPicker = ({ value, disabled = false, onChange }: IconPickerProps) => (
  <div className="flex items-center gap-2">
    <input
      value={value ?? ''}
      onChange={event => {
        const nextValue = event.target.value.trim();
        onChange(nextValue ? nextValue : null);
      }}
      disabled={disabled}
      maxLength={32}
      placeholder="아이콘 키를 입력하세요"
      className="w-full rounded-xl border border-line bg-elevated-background px-3 py-2 text-sm
        text-primary transition outline-none focus:border-highlight disabled:cursor-not-allowed"
    />
    <button
      type="button"
      onClick={() => onChange(null)}
      disabled={disabled || value === null}
      className="flex-none rounded-lg border border-line bg-base-background px-3 py-2 text-xs
        font-medium text-primary transition hover:bg-elevated-background
        disabled:cursor-not-allowed"
    >
      지우기
    </button>
  </div>
);
