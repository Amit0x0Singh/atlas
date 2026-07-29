import { useEffect, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import ResourceCard from '../components/dashboard/ResourceCard.jsx';
import { resources } from '../data/resources.js';
import { NAV_GROUPS } from '../data/navGroups.js';
import { getStats } from '../api/http.js';
import { useFavorites } from '../hooks/useFavorites.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null); // null = not loaded yet; cards just omit the count
  const { isFavorite, toggleFavorite, favorites } = useFavorites();

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats({}));
  }, []);

  const favoriteResources = resources.filter((r) => favorites.includes(r.key));

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: resources.filter((r) => r.group === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Panel"
        title="Application Data"
        description={`${resources.length} tables across ${groups.length} modules. Click any table to view, add, edit, or delete records.`}
      />

      {favoriteResources.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3">★ Favorites</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoriteResources.map((resource) => (
              <ResourceCard
                key={resource.key}
                resource={resource}
                count={stats?.[resource.path]}
                isFavorite
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: group.color }}>{group.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.items.map((resource) => (
              <ResourceCard
                key={resource.key}
                resource={resource}
                count={stats?.[resource.path]}
                isFavorite={isFavorite(resource.key)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
