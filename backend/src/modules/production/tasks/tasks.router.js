import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { requirePlantInScope, requireRecordPlantInScope } from '../../../middleware/scope.js'
import {
  listTasks, createTask, updateTask, deleteTask, sendSchedule,
  searchSalesOrders, getSalesOrderItems, searchProducts, listEquipmentByPlant,
} from './tasks.controller.js'

const TasksRouter = express.Router()
const canView   = authorize('production.tasks.view')
const canCreate = authorize('production.tasks.create')
const canUpdate = authorize('production.tasks.update')
const scopedById = requireRecordPlantInScope({ model: 'productionTask', idParam: 'id', plantField: 'plant' })

TasksRouter.get   ('/plan-tasks',                 canView, listTasks)
TasksRouter.post  ('/plan-tasks',                 canCreate, requirePlantInScope('plant'), createTask)
TasksRouter.put   ('/plan-tasks/:id',             canUpdate, scopedById, requirePlantInScope('plant'), updateTask)
TasksRouter.delete('/plan-tasks/:id',             authorize('production.tasks.delete'), scopedById, deleteTask)
TasksRouter.post  ('/plan-tasks/send-schedule',   canUpdate, sendSchedule)

// Lookup endpoints (for form autocomplete)
TasksRouter.get('/plan-tasks/search/sales-orders',       canView, searchSalesOrders)
TasksRouter.get('/plan-tasks/search/sales-order-items',  canView, getSalesOrderItems)
TasksRouter.get('/plan-tasks/search/products',           canView, searchProducts)
TasksRouter.get('/plan-tasks/search/equipment',          canView, listEquipmentByPlant)

export default TasksRouter
