interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <nav className="mt-4 flex w-full gap-1 border-b-2 border-black/10 dark:border-white/15">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`-mb-0.5 rounded-t-md border border-b-0 px-3 py-1.5 ${
            active === tab.id
              ? "border-black/10 bg-neutral-100 opacity-100 dark:border-white/15 dark:bg-neutral-800"
              : "border-transparent opacity-60"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
