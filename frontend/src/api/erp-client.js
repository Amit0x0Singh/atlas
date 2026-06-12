// Re-exports from module files — import directly from the module for new code.
// This shim keeps all existing `import { ... } from '...api/erp-client'` working.

export { authApi } from './auth.js'
export { erpItemsApi, erpSuppliersApi, erpPlantsApi, erpEquipmentApi, erpProductsApi, erpBomApi, erpStrainsApi, erpCustomersApi, erpReasonCodesApi, erpContainersApi } from './masters.js'
export { gateApi, inventoryApi } from './inventory.js'
export { bomIssuanceApi } from './production.js'
export { salesApi } from './sales.js'
export { planningApi } from './planning.js'
export { microbialApi } from './microbial.js'
export { notifApi } from './notifications.js'
export { exportApi, exportUrl } from './export.js'

export { erpApi as api, erpApi } from '../context/context.jsx'
