import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 1500;
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);

// Polls a backup/restore job's status endpoint until it reaches a terminal
// state — there's no realtime/websocket infra in this app, so coarse
// (per-table) progress via polling is the pragmatic choice here.
export function useJobPolling(jobId, fetchStatus) {
  const [job, setJob] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await fetchStatus(jobId);
        if (cancelled) return;
        setJob(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(intervalRef.current);
        }
      } catch {
        // Transient poll failure — try again on the next tick rather than
        // giving up on the whole job.
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return job;
}
