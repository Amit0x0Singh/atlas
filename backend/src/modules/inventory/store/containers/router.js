import express from 'express'
import { authorize } from '../../../../middleware/auth.js'
import { listContainers, getContainer, getContainerLabel } from './get/containers.controller.js'
import { createContainer, fillContainer, issueFromContainer } from './create/containers.controller.js'
import { validateCreateContainer, validateFillContainer, validateIssueFromContainer } from './create/containers.middleware.js'
import { updateContainerCapacity } from './update/containers.controller.js'
import { validateUpdateCapacity } from './update/containers.middleware.js'

const ContainersRouter = express.Router()
const canView   = authorize('inventory.containers.view')
const canCreate = authorize('inventory.containers.create')
const canUpdate = authorize('inventory.containers.update')

ContainersRouter.get('/', canView, listContainers)
ContainersRouter.post('/', canCreate, validateCreateContainer, createContainer)
ContainersRouter.get('/:containerId/label', canView, getContainerLabel)
ContainersRouter.get('/:containerId', canView, getContainer)
ContainersRouter.post('/:containerId/fill', canCreate, validateFillContainer, fillContainer)
ContainersRouter.post('/:containerId/issue', canCreate, validateIssueFromContainer, issueFromContainer)
ContainersRouter.patch('/:containerId/capacity', canUpdate, validateUpdateCapacity, updateContainerCapacity)

export default ContainersRouter
