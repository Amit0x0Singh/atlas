export default function SalesOrderTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-0 mb-6 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === tab.key
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
