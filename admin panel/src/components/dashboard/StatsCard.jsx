import { Link } from 'react-router-dom';

export default function StatsCard({ resource, color, count }) {
  return (
    <Link to={`/${resource.path}`} className="resource-card" style={{ '--card-accent': color }}>
      <span>{resource.model}</span>
      <h3>
        {resource.title}
        {typeof count === 'number' && (
          <span className="record-count" style={{ marginLeft: 8 }}>{count.toLocaleString()}</span>
        )}
      </h3>
      <p>{resource.description}</p>
    </Link>
  );
}
