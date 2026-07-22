import { useState, useMemo, useEffect } from "react";
import { usePacks } from "../../../hooks/usePacks.js";
import Pagination from "../../../../../../components/pagination/Pagination.jsx";
import { groupPacks } from "../utils/groupPacks.js";
import PackTableToolbar from "../components/PackTableToolbar.jsx";
import PackTableRow from "../components/PackTableRow.jsx";

export default function PackTable({ reloadTrigger }) {
  const [filterCode, setFilterCode]     = useState("");
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [page, setPage]                  = useState(1);
  const [limit, setLimit]                = useState(15);
  const { packs, loading }              = usePacks(filterCode, reloadTrigger);

  const allGroups = useMemo(() => groupPacks(packs), [packs]);

  // A group is "pending" if at least one bag is still AWAITING_INWARD
  const pendingGroups   = useMemo(() => allGroups.filter(g => g.bags.some(b => b.status === 'AWAITING_INWARD')), [allGroups]);
  const completedGroups = useMemo(() => allGroups.filter(g => g.bags.every(b => b.status !== 'AWAITING_INWARD')), [allGroups]);
  const groups          = showCompleted ? allGroups : pendingGroups;

  const paginatedGroups = groups.slice((page - 1) * limit, page * limit);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [showCompleted, filterCode]);

  const toggle = (key) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const expandAll  = () => setExpandedKeys(new Set(groups.map((g) => g.key)));
  const collapseAll = () => setExpandedKeys(new Set());

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <PackTableToolbar
        loading={loading}
        pendingGroups={pendingGroups}
        completedGroups={completedGroups}
        allGroups={allGroups}
        packs={packs}
        showCompleted={showCompleted}
        setShowCompleted={setShowCompleted}
        filterCode={filterCode}
        setFilterCode={setFilterCode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {loading ? (
        <p className="text-gray-400 py-8 text-center">Loading…</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white text-xs">
              <tr>
                <th className="w-8 px-3 py-2.5" />
                <th className="text-left px-3 py-2.5 font-semibold">Item</th>
                <th className="text-left px-3 py-2.5 font-semibold">Lot / Invoice</th>
                <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                <th className="text-center px-3 py-2.5 font-semibold">Bags</th>
                <th className="text-left px-3 py-2.5 font-semibold">Total Qty</th>
                <th className="text-left px-3 py-2.5 font-semibold">Received</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold">Print All QRs</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    {!showCompleted && completedGroups.length > 0
                      ? `All ${completedGroups.length} invoice(s) are fully scanned.`
                      : "No pack records found."}
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g) => (
                  <PackTableRow key={g.key} group={g} isOpen={expandedKeys.has(g.key)} onToggle={() => toggle(g.key)} />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3">
          <Pagination page={page} total={groups.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
        </div>
        </>
      )}
    </div>
  );
}
