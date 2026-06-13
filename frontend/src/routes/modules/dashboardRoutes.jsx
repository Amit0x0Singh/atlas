import { Route, Navigate } from "react-router-dom";
import Stock from "../../pages/inventory/store/stock/page/Stock.jsx";

export const dashboardRoutes = [
  <Route key="root" path="/" element={<Navigate to="/stock" replace />} />,
  <Route key="stock" path="/stock" element={<Stock />} />,
];
