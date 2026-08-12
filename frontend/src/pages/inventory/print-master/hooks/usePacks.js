import { useState, useEffect, useCallback } from "react";
import { packsApi } from "../../../../api/inventory.js";

export function usePacks(filterCode, reloadTrigger) {
  const [packs, setPacks]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await packsApi.list({
        itemCode: filterCode || undefined,
        // "all" — this page groups+paginates client-side and must see every
        // pending group, not just the most-recently-created 500 bag rows.
        limit: "all",
      });
      setPacks(r.data || []);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [filterCode]);

  useEffect(() => {
    load();
  }, [load, reloadTrigger]);

  return { packs, loading, reload: load };
}
