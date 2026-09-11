import { Route } from "react-router-dom";
import HomePage from "../../pages/home/page/HomePage.jsx";
import UomDocs from "../../pages/docs/uom/page/UomDocs.jsx";

// Always-accessible welcome page — the post-login landing for EVERY account
// (see defaultPathForUser). No entry in operationMap.js so
// permissionForPath('/home') stays null.
//
// /docs/uom is the same "always accessible, no permission required" shape —
// a reference page any account can open regardless of role.
export const homeRoutes = [
  <Route key="home" path="/home" element={<HomePage />} />,
  <Route key="docs-uom" path="/docs/uom" element={<UomDocs />} />,
];
