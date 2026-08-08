import { useState } from "react";
import './ContainerList.css';
import { containerApi } from "../../../../../../api/inventory.js";
import { openAuthedFile } from "../../../../../../utils/authedFile.js";
import { useContainers } from "../../hooks/useContainers.js";
import Pagination from "../../../../../../components/pagination/Pagination.jsx";
import { Button, IconButton, Modal } from "../../../../../../components/ui";
import { Pencil } from "lucide-react";

function fillPct(c) {
  if (!c.capacity) return 0;
  return Math.min(100, Math.round((c.currentQty / c.capacity) * 100));
}

function barColor(pct) {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 30) return "bg-yellow-400";
  return "bg-red-400";
}

function PctBadge({ pct }) {
  const cls =
    pct >= 75
      ? "bg-green-100 text-green-700"
      : pct >= 30
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-600";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
      {pct}%
    </span>
  );
}

export default function ContainerList() {
  const { containers, loading, error, reload } = useContainers();
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  const paginated = containers.slice((page - 1) * limit, page * limit);

  const [editing, setEditing]   = useState(null); // container being edited, or null
  const [newCapacity, setNewCapacity] = useState("");
  const [saving, setSaving]     = useState(false);
  const [editErr, setEditErr]   = useState("");

  const openEdit = (c) => {
    setEditing(c);
    setNewCapacity(String(c.capacity));
    setEditErr("");
  };

  const saveCapacity = async () => {
    const val = parseFloat(newCapacity);
    if (!val || val <= 0) { setEditErr("Enter a valid capacity"); return; }
    setSaving(true); setEditErr("");
    try {
      await containerApi.updateCapacity(editing.containerId, val);
      setEditing(null);
      reload();
    } catch (e) { setEditErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (loading)
    return <p className="text-gray-400 text-sm p-6">Loading containers…</p>;
  if (error) return <p className="text-red-500 text-sm p-6">{error}</p>;

  if (containers.length === 0)
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-5 py-5 rounded-xl text-sm">
          No containers found. Create your first container using the{" "}
          <strong>Create Container</strong> tab.
        </div>
      </div>
    );

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500 font-medium">
          {containers.length} container{containers.length !== 1 ? "s" : ""}
        </p>
        <Button variant="outline-gray" size="sm" onClick={reload}>Refresh</Button>
      </div>

      {/* Header row */}
      <div className="bg-slate-700 text-white text-xs font-semibold rounded-t-xl grid grid-cols-[180px_350px_1fr_90px_60px_44px] gap-3 px-4 py-2.5">
        <span>Container ID</span>
        <span>Item Name</span>
        <span>Stock Level</span>
        <span className="text-right">Qty / Cap</span>
        <span className="text-center">Label</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl divide-y divide-gray-100">
        {paginated.map((c) => {
          const pct = fillPct(c);
          return (
            <div
              key={c.containerId}
              className="grid grid-cols-[180px_350px_1fr_90px_60px_44px] gap-3 items-center px-4 py-2.5 hover:bg-blue-50 transition-colors"
            >
              {/* Container ID */}
              <div>
                <div className="font-mono font-bold text-xs text-gray-900 truncate">
                  {c.containerId}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {c.itemCode}
                </div>
              </div>

              {/* Item name */}
              <div className="text-xs text-gray-700 font-medium truncate">
                {c.itemName || "—"}
              </div>

              {/* Progress bar + % */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <PctBadge pct={pct} />
              </div>

              {/* Qty / Cap */}
              <div className="text-right">
                <div className="text-xs font-bold text-gray-800">
                  {c.currentQty.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-400">
                  {c.capacity} {c.uom}
                </div>
              </div>

              {/* QR Label */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => openAuthedFile(containerApi.labelUrl(c.containerId)).catch(e => alert(`Print failed: ${e.message}`))}
                  className="text-[10px] border border-orange-200 bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100 whitespace-nowrap"
                >
                  QR
                </button>
              </div>

              {/* Edit capacity */}
              <div className="flex justify-center">
                <IconButton icon={Pencil} onClick={() => openEdit(c)} tooltip="Edit container size" size="sm" />
              </div>
            </div>
          );
        })}
      </div>
      <Pagination page={page} total={containers.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />

      {/* Edit capacity modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} size="sm">
        {editing && (
          <div className="p-5">
            <h3 className="text-base font-bold text-gray-900 mb-1">Edit Container Size</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">{editing.containerId} · {editing.itemName}</p>

            {editErr && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-xs">{editErr}</div>
            )}

            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Capacity ({editing.uom})
            </label>
            <input
              type="number" min="0.001" step="0.001" autoFocus
              value={newCapacity}
              onChange={e => setNewCapacity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Current stock: {editing.currentQty.toFixed(2)} {editing.uom} — new capacity can't be set below this.
            </p>

            <div className="flex gap-3 mt-5">
              <Button variant="secondary" fullWidth onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="warning" fullWidth loading={saving} onClick={saveCapacity}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
