import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import Card from '../common/Card.jsx';

// The Dashboard's per-resource nav card — distinct from StatsCard, which
// shows a breakdown stat, not a clickable link to a whole resource.
export default function ResourceCard({ resource, count, isFavorite, onToggleFavorite }) {
  return (
    <Card hover padding={false} className="relative group">
      <Link to={`/${resource.path}`} className="block p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{resource.model}</span>
          {typeof count === 'number' && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 rounded-full px-2 py-0.5">
              {count.toLocaleString()}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">{resource.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{resource.description}</p>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFavorite(resource.key); }}
          className={[
            'absolute top-3 right-3 transition-opacity text-slate-300 hover:text-amber-400',
            isFavorite ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </Card>
  );
}
