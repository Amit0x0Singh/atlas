import { useState, useEffect } from "react";
import { packsApi } from "../../../../api/client.js";

export function usePacks(filterCode) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await packsApi.list({
        itemCode: filterCode || undefined,
        limit: 100,
      });
      setPacks(r.data || []);
    } catch {
      // swallow — caller can handle via empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterCode]);

  return { packs, loading, reload: load };
}
