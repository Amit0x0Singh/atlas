// Re-exports from module files — import directly from the module for new code.
// This shim keeps all existing `import { ... } from '...api/client'` working.

export { rmApi, packsApi, inwardApi, outwardApi, sfgApi, stockApi, ledgerApi, importApi, grnApi, bulkApi } from './inventory.js'
export { productApi, equipmentApi, recipeApi } from './masters.js'
export { productionApi, indentApi } from './production.js'
export { salesOrderApi, customerProfileApi, cpProfileApi, bomSendApi, trackerApi } from './sales.js'
export { planEngineApi as planningApi } from './planning.js'
export { microbialSfgApi } from './microbial.js'
export { employeeApi } from './hr.js'
