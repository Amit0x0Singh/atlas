import { Route, Navigate } from "react-router-dom";
import Inward from "../../pages/inventory/store/inward/page/Inward.jsx";
import Outward from "../../pages/inventory/store/outward/page/Outward.jsx";
import Containers from "../../pages/inventory/store/containers/page/Containers.jsx";
import GRN from "../../pages/inventory/store/grn/page/GRN.jsx";
import Ledger from "../../pages/inventory/store/ledger/page/Ledger.jsx";
import MicrobeTransaction from "../../pages/microbial/transaction/page/MicrobeTransaction.jsx";
import Indent from "../../pages/production/indent/page/Indent.jsx";
import GateEntry from "../../pages/inventory/gate/page/GateEntry.jsx";

export const inventoryRoutes = [
  <Route key="gate" path="/gate" element={<GateEntry />} />,
  <Route key="inward" path="/inward" element={<Inward />} />,
  <Route key="outward" path="/outward" element={<Outward />} />,
  <Route key="containers" path="/containers" element={<Containers />} />,
  <Route
    key="microbe-transaction"
    path="/microbe-transaction"
    element={<MicrobeTransaction />}
  />,
  // Old bookmarked URL — keep resolving to the same (now expanded) page.
  <Route
    key="microbial-inward-redirect"
    path="/microbial-inward"
    element={<Navigate to="/microbe-transaction" replace />}
  />,
  <Route key="grn" path="/grn" element={<GRN />} />,
  <Route key="ledger" path="/ledger" element={<Ledger />} />,
  <Route key="indent" path="/indent" element={<Indent />} />,
];
