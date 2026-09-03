import { Route } from "react-router-dom";
import ProfilePage from "../../pages/profile/page/ProfilePage.jsx";

// Any authenticated user can view their own profile — no permission entry
// in operationMap.js, so permissionForPath('/profile') resolves to null.
export const profileRoutes = [
  <Route key="profile" path="/profile" element={<ProfilePage />} />,
];
