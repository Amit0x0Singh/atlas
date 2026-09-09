import { Route } from "react-router-dom";
import HomePage from "../../pages/home/page/HomePage.jsx";

// Always-accessible welcome page — the post-login landing for EVERY account
// (see defaultPathForUser). No entry in operationMap.js so
// permissionForPath('/home') stays null.
export const homeRoutes = [
  <Route key="home" path="/home" element={<HomePage />} />,
];
