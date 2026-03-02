import { NOTEBOOK_COLORS } from '../_constants/notebook';

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => (
  <div className="space-y-2">
    <p className="text-sm font-medium text-primary">표지 색상</p>
    <ul className="flex flex-wrap gap-2">
      {NOTEBOOK_COLORS.map(color => {
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
  </div>
);
