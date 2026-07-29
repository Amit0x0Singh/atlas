import express from 'express';
import { previewImpact } from './preview/data-management.controller.js';
import { createDelete } from './create/data-management.controller.js';
import { listDeletes, getDeleteDetails, getDeleteStatus } from './get/data-management.controller.js';
import { deleteDeleteJob } from './delete/data-management.controller.js';

const router = express.Router();

router.post('/preview', previewImpact);
router.get('/', listDeletes);
router.post('/', createDelete);
router.get('/:id', getDeleteDetails);
router.get('/:id/status', getDeleteStatus);
router.delete('/:id', deleteDeleteJob);

export default router;
