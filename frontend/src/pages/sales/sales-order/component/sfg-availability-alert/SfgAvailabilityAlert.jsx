import { IconButton } from "../../../../../components/ui";
import { X } from "lucide-react";

export default function SfgAvailabilityAlert({ sfgAlert, onDismiss }) {
  return (
    <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-green-800 mb-2">
            ✅ SFG Stock Available — Planner Action Required
          </p>
          <div className="space-y-1">
            {sfgAlert.map((s, i) => (
              <div key={i} className="text-sm text-green-700 flex gap-3">
                <span className="font-semibold">{s.productCode}</span>
                <span>{s.productName}</span>
                <span className="ml-auto text-green-900 font-semibold">
                  {s.sfgQty} {s.uom} in SFG
                  {s.orderedQty && (
                    <span
                      className={
                        s.sfgQty >= s.orderedQty
                          ? " text-green-600"
                          : " text-orange-600"
                      }
                    >
                      {" "}
                      (ordered {s.orderedQty} {s.uom}
                      {s.sfgQty >= s.orderedQty
                        ? " — fully covered ✓"
                        : " — partial"}
                      )
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-green-600 mt-2">
            Inform the planner — these products can be packed directly from
            SFG stock.
          </p>
        </div>
        <IconButton icon={X} tooltip="Dismiss" variant="ghost" size="xs" onClick={onDismiss} className="text-green-600" />
      </div>
    </div>
  );
}
