interface Tab {
  id: string;
  label: string;
}

interface DashboardTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export const DashboardTabs = ({ tabs, active, onChange }: DashboardTabsProps) => {
  return (
    <div className="flex gap-0 border-b border-border-default mb-5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="font-sans text-[13px] font-medium px-[18px] py-[9px] border-none bg-transparent cursor-pointer -mb-px transition-colors"
          style={{
            borderBottom:
              active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: active === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
