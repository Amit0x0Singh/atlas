import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import { listContainers, getContainer, getContainerLabel } from './get/containers.controller.js'
import { createContainer, fillContainer, issueFromContainer } from './create/containers.controller.js'
import { validateCreateContainer, validateFillContainer, validateIssueFromContainer } from './create/containers.middleware.js'
import { updateContainerCapacity } from './update/containers.controller.js'
import { validateUpdateCapacity } from './update/containers.middleware.js'

const ContainersRouter = express.Router()
const storeOrAbove = authorize(['store'])

ContainersRouter.get('/', authenticate, listContainers)
ContainersRouter.post('/', authenticate, storeOrAbove, validateCreateContainer, createContainer)
ContainersRouter.get('/:containerId/label', authenticate, getContainerLabel)
ContainersRouter.get('/:containerId', authenticate, getContainer)
ContainersRouter.post('/:containerId/fill', authenticate, storeOrAbove, validateFillContainer, fillContainer)
ContainersRouter.post('/:containerId/issue', authenticate, storeOrAbove, validateIssueFromContainer, issueFromContainer)
ContainersRouter.patch('/:containerId/capacity', authenticate, storeOrAbove, validateUpdateCapacity, updateContainerCapacity)

export default ContainersRouter
