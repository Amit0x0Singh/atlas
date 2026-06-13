import { useState } from "react";
import { packsApi } from "../../../../api/inventory.js";
import { useRmSearch } from "../hooks/useRmSearch.js";

const today = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  numberOfBags: "",
  packQty: "",
  supplier: "",
  invoiceNo: "",
  receivedDate: today(),
};

export default function GenerateForm({ onGenerated }) {
  const {
    rmList,
    rmSearch,
    showRmDrop,
    setShowRmDrop,
    filteredRm,
    nextLot,
    selectedRm,
    selectRm,
    clearSelection,
    handleSearchChange,
  } = useRmSearch();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRm) {
      setError("Please select an RM first");
      return;
    }
    if (!form.numberOfBags || !form.packQty) {
      setError("Number of bags and qty per bag are required");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await packsApi.generate({
        ...selectedRm,
        ...form,
        numberOfBags: parseInt(form.numberOfBags),
        packQty: parseFloat(form.packQty),
      });
      setResult(res.data);
      setForm(EMPTY_FORM);
      clearSelection();
      onGenerated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Generate New Packs</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded mb-3 text-sm">
          ✅ Generated {result.packs?.length} packs — Lot:{" "}
          <strong>{result.lotNo}</strong>
          <br />
          <a
            href={packsApi.batchLabelsUrl(
              result.packs?.[0]?.itemCode,
              result.lotNo,
            )}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline mt-1 block"
          >
            🖨️ Print All Labels for Lot {result.lotNo}
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* RM Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item *
          </label>
          <input
            value={rmSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowRmDrop(true)}
            placeholder="Type to search RM..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showRmDrop && filteredRm.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredRm.map((rm) => (
                <button
                  type="button"
                  key={rm.itemCode}
                  onClick={() => selectRm(rm)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                >
                  <span className="font-medium">{rm.itemName}</span>
                  <span className="text-gray-400 ml-2 text-xs">
                    ({rm.itemCode})
                  </span>
                </button>
              ))}
            </div>
          )}
          {rmList.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">
              No items found. Add items in Item Master first.
            </p>
          )}
        </div>

        {selectedRm && (
          <div className="bg-blue-50 px-3 py-2 rounded-lg text-sm">
            <span className="font-medium text-blue-900">Selected:</span>{" "}
            {selectedRm.itemName} ({selectedRm.itemCode}) — {selectedRm.uom}
            {nextLot && (
              <span className="ml-2 text-blue-600">
                | Next Lot: <strong>{nextLot}</strong>
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Bags *
            </label>
            <input
              type="number"
              min="1"
              value={form.numberOfBags}
              onChange={setField("numberOfBags")}
              placeholder="20"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qty per Bag ({selectedRm?.uom || "KG"}) *
            </label>
            <input
              type="number"
              step="0.01"
              value={form.packQty}
              onChange={setField("packQty")}
              placeholder="25"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier
          </label>
          <input
            value={form.supplier}
            onChange={setField("supplier")}
            placeholder="Supplier name (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice No
            </label>
            <input
              value={form.invoiceNo}
              onChange={setField("invoiceNo")}
              placeholder="INV-2026-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received Date
            </label>
            <input
              type="date"
              value={form.receivedDate}
              onChange={setField("receivedDate")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50"
        >
          {loading ? "Generating..." : "🖨️ Generate Pack IDs"}
        </button>
      </form>
    </div>
  );
}
