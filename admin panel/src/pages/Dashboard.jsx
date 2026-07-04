import { useEffect, useState } from 'react';
import { resources } from '../data/resources.js';
import { NAV_GROUPS } from '../data/navGroups.js';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { getStats } from '../api/http.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null); // null = not loaded yet; cards just omit the count

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats({}));
  }, []);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: resources.filter((r) => r.group === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <h2>Application Data <span className="record-count">{resources.length} tables</span></h2>
          <p className="text-muted mb-0">Click any table to view, add, edit, or delete records.</p>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 32 }}>
          <div className="sidebar-section" style={{ color: group.color, fontSize: '0.75rem', padding: '0 0 8px', marginBottom: 8 }}>
            {group.label}
          </div>
          <div className="resource-grid">
            {group.items.map((resource) => (
              <StatsCard
                key={resource.key}
                resource={resource}
                color={group.color}
                count={stats?.[resource.key]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
