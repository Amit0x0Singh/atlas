import { Route } from "react-router-dom";
import SettingsPage from "../../pages/settings/page/SettingsPage.jsx";

export const settingsRoutes = [
  <Route key="settings" path="/settings" element={<SettingsPage />} />,
];
