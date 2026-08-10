export type ViewMode = "table" | "cards";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "cards", label: "Cards" },
];

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="my-2 flex justify-center gap-4">
      {VIEW_MODES.map((mode) => (
        <label key={mode.value} className="flex cursor-pointer items-center gap-1">
          <input type="radio" name="viewMode" checked={value === mode.value} onChange={() => onChange(mode.value)} />
          {mode.label}
        </label>
      ))}
    </div>
  );
}
