import Card from '../common/Card.jsx';

const ACCENTS = {
  blue:  'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  red:   'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function StatsCard({ icon: Icon, label, value, caption, accent = 'blue' }) {
  return (
    <Card hover className="flex items-start justify-between gap-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
        {caption && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{caption}</p>}
      </div>
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ACCENTS[accent] || ACCENTS.blue}`}>
          <Icon size={15} />
        </div>
      )}
    </Card>
  );
}
