const inp =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";

export default function DispatchEntryFields({
  invoiceNo, setInvoiceNo,
  transportName, setTransportName,
  dispatchedBy, setDispatchedBy,
  remarks, setRemarks,
}) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
        Dispatch Entry
      </p>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Invoice No.
          </label>
          <input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            className={inp}
            placeholder="INV-001"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Transport / Courier
          </label>
          <input
            value={transportName}
            onChange={(e) => setTransportName(e.target.value)}
            className={inp}
            placeholder="Truck / courier name"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Dispatched By
          </label>
          <input
            value={dispatchedBy}
            onChange={(e) => setDispatchedBy(e.target.value)}
            className={inp}
            placeholder="Name"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Remarks
          </label>
          <input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className={inp}
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  );
}
