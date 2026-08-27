import { Button } from "../../../../../components/ui";
import { Can } from "../../../../../components/common/Can.jsx";
import { Plus } from "lucide-react";
import { STATUSES, STATUS_STYLE, STATUS_LABELS } from "../../shared/constants.js";

export default function OrdersTab({ summary, onNewOrder }) {
  return (
    <div>
      {/* Status summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {STATUSES.map((s) => (
          <div
            key={s}
            className={`text-center p-3 rounded-xl border ${STATUS_STYLE[s]} border-current`}
          >
            <div className="text-2xl font-bold">{summary[s]}</div>
            <div className="text-xs mt-0.5 font-semibold">
              {STATUS_LABELS[s]}
            </div>
          </div>
        ))}
      </div>

      {/* "+ New Order" button */}
      <div className="flex items-center justify-between mb-5">
        <Can permission="sales.order.create">
          <Button variant="success" icon={Plus} onClick={onNewOrder}>
            New Order
          </Button>
        </Can>
      </div>
    </div>
  );
}
