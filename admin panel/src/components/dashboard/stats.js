import { Database, CheckCircle2, Clock, XCircle, AlertCircle, MoreHorizontal, CalendarClock } from 'lucide-react';

function isStatusLikeField(field) {
  if (field.type === 'select' && field.options?.length) return true;
  return /status|type|tracking|flagged/i.test(field.name);
}

function isDateField(field) {
  return field.type === 'date' || field.type === 'datetime-local';
}

function iconForValue(value) {
  const v = String(value).toUpperCase();
  if (/(ACTIVE|COMPLETED|INWARDED|APPROVED|ISSUED|TRUE|YES|HEALTHY)/.test(v)) return { icon: CheckCircle2, accent: 'green' };
  if (/(PENDING|AWAITING|WATCH|RESERVED|OPEN|DRAFT)/.test(v)) return { icon: Clock, accent: 'amber' };
  if (/(CANCELLED|EXHAUSTED|REJECTED|FALSE|NO|AT_RISK|DEPLETED)/.test(v)) return { icon: XCircle, accent: 'red' };
  return { icon: AlertCircle, accent: 'blue' };
}

/**
 * Generic per-resource stats, derived purely from each resource's own field
 * definitions — not hand-coded per resource. Works uniformly across all 43
 * resources instead of hard-coding e.g. "Pending/Approved/Rejected" for one
 * page (many resources, like qcSample, don't even have a status field).
 */
export function computeStats(resource, records, total) {
  const stats = [
    { key: 'total', label: 'Total Records', value: (total ?? records.length).toLocaleString(), icon: Database, accent: 'blue' },
  ];

  const statusField = resource.fields.find(isStatusLikeField);
  if (statusField) {
    const counts = new Map();
    for (const rec of records) {
      const v = rec[statusField.name];
      if (v === null || v === undefined || v === '') continue;
      const key = String(v);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3);
    const otherCount = sorted.slice(3).reduce((sum, [, c]) => sum + c, 0);

    top.forEach(([value, count]) => {
      const { icon, accent } = iconForValue(value);
      stats.push({ key: `${statusField.name}:${value}`, label: value, value: count.toLocaleString(), icon, accent, caption: statusField.label });
    });
    if (otherCount > 0) {
      stats.push({ key: `${statusField.name}:other`, label: 'Other', value: otherCount.toLocaleString(), icon: MoreHorizontal, accent: 'slate', caption: statusField.label });
    }
  }

  const dateField = resource.fields.find((f) => f.readOnly && isDateField(f) && /created/i.test(f.name));
  if (dateField && stats.length < 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = records.filter((rec) => {
      const raw = rec[dateField.name];
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d >= today;
    }).length;
    stats.push({ key: 'today', label: "Added Today", value: todayCount.toLocaleString(), icon: CalendarClock, accent: 'blue' });
  }

  return stats.slice(0, 5);
}
