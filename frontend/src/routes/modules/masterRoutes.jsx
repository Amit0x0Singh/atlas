import { Route } from "react-router-dom";
import RmMaster from "../../pages/masters/rm/page/RmMaster.jsx";
import ProductMaster from "../../pages/masters/product/page/ProductMaster.jsx";
import EquipmentMaster from "../../pages/masters/equipment/page/EquipmentMaster.jsx";
import MicrobesMaster from "../../pages/masters/microbes/page/MicrobesMaster.jsx";
import RecipeDB from "../../pages/masters/recipe/page/RecipeDB.jsx";
import PrintMaster from "../../pages/inventory/print-master/page/PrintMaster.jsx";
import PackEntries from "../../pages/inventory/print-master/page/PackEntries.jsx";
import EmployeeMaster from "../../pages/hr/employee/page/EmployeeMaster.jsx";
import SupplierMaster from "../../pages/masters/supplier/page/SupplierMaster.jsx";
import UserRoles from "../../pages/masters/user-roles/page/UserRoles.jsx";
import UserFormPage from "../../pages/masters/user-roles/page/UserFormPage.jsx";
import RoleFormPage from "../../pages/masters/user-roles/page/RoleFormPage.jsx";
import AuditLogs from "../../pages/admin/audit-logs/page/AuditLogs.jsx";

export const masterRoutes = [
  <Route key="rm-master"        path="/rm-master"        element={<RmMaster />} />,
  <Route key="product-master"   path="/product-master"   element={<ProductMaster />} />,
  <Route key="equipment-master" path="/equipment-master" element={<EquipmentMaster />} />,
  <Route key="supplier-master"  path="/supplier-master"  element={<SupplierMaster />} />,
  <Route key="print-master"         path="/print-master"                element={<PrintMaster />} />,
  <Route key="print-master-entries" path="/print-master/entries"        element={<PackEntries />} />,
  <Route key="microbes-master"  path="/microbes-master"  element={<MicrobesMaster />} />,
  <Route key="employee-master"  path="/employee-master"  element={<EmployeeMaster />} />,
  <Route key="recipe"           path="/recipe"           element={<RecipeDB />} />,
  <Route key="user-roles"       path="/user-roles"       element={<UserRoles />} />,
  <Route key="user-roles-new-user"  path="/user-roles/users/new"      element={<UserFormPage />} />,
  <Route key="user-roles-edit-user" path="/user-roles/users/:userId"  element={<UserFormPage />} />,
  <Route key="user-roles-new-role"  path="/user-roles/roles/new"      element={<RoleFormPage />} />,
  <Route key="user-roles-edit-role" path="/user-roles/roles/:roleId"  element={<RoleFormPage />} />,
  <Route key="audit-logs"       path="/audit-logs"       element={<AuditLogs />} />,
];
