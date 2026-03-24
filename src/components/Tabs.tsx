export function Tabs({ 
  tabs, 
  activeTab, 
  onChange 
}: { 
  tabs: { id: string, label: string, icon: React.ReactNode }[], 
  activeTab: string, 
  onChange: (id: string) => void 
}) {
  return (
    <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-800/50 w-fit mx-auto mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === tab.id
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
