import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import AppSidebar from "../components/menu-bar/page/menu-bar.jsx";
import Login from "../pages/auth/page/Login.jsx";
import Setup from "../pages/auth/page/Setup.jsx";
import AccessDenied from "../components/common/AccessDenied.jsx";
import { useApp } from "../context/context.jsx";
import { permissionForPath, defaultPathForUser } from "./operationMap.js";

import { dashboardRoutes } from "./modules/dashboardRoutes.jsx";
import { masterRoutes }    from "./modules/masterRoutes.jsx";
import { inventoryRoutes } from "./modules/inventoryRoutes.jsx";
import { salesRoutes }     from "./modules/salesRoutes.jsx";
import { productionRoutes } from "./modules/productionRoutes.jsx";
import { qualityRoutes }   from "./modules/qualityRoutes.jsx";
import { reportsRoutes }   from "./modules/reportsRoutes.jsx";
import { erpRoutes }       from "./modules/erpRoutes.jsx";
import { settingsRoutes }  from "./modules/settingsRoutes.jsx";

function AppLayout() {
  const { user, hasPermission } = useApp();
  const location = useLocation();
  const defaultPath = defaultPathForUser(user);

  // The shared dashboard ("/") sends everyone to their own landing page
  // instead of a one-size-fits-all page.
  if (location.pathname === "/") {
    return <Navigate to={defaultPath} replace />;
  }

  const requiredPerm = permissionForPath(location.pathname);
  const allowed = !requiredPerm || !user || hasPermission(requiredPerm);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <AppSidebar />
      <main style={{ flex: 1, overflowY: "auto", background: "#f1f5f9" }}>
        {allowed ? (
          <Routes>
            {dashboardRoutes}
            {masterRoutes}
            {inventoryRoutes}
            {salesRoutes}
            {productionRoutes}
            {qualityRoutes}
            {reportsRoutes}
            {erpRoutes}
            {settingsRoutes}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        ) : (
          <AccessDenied variant="page" requiredPermission={requiredPerm} homePath={defaultPath} />
        )}
      </main>
    </div>
  );
}

export default function AppRoutes() {
  const { user } = useApp();

  return (
    <Routes>
      {/* Public — usable without being logged in, since a fresh deploy with
          an empty database has no account to log in as yet. Self-disables
          on the backend once any user exists (see setup.controller.js). */}
      <Route path="/setup" element={user ? <Navigate to="/" replace /> : <Setup />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={user ? <AppLayout /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
