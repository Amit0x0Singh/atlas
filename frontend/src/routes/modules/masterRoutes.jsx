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
];
