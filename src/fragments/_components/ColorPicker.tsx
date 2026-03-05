import { COLORS_PRESET } from '@/constants/colors';

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => (
  <ul className="flex flex-wrap gap-2">
    {COLORS_PRESET.map(color => {
      const selected = value === color;

      return (
        <li key={color}>
          <button
            type="button"
            onClick={() => onChange(color)}
            aria-label={`표지 색상 ${color}`}
            aria-pressed={selected}
            className="h-8 w-8 rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: color,
              outline: `2px solid ${color}`,
              outlineOffset: selected ? '2px' : '-2px',
            }}
          />
        </li>
      );
    })}
  </ul>
);
