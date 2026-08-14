import express from 'express';
import { authorize } from '../../middleware/auth.js';
import { listRecords, getRecord, getStats } from './get/admin_panel.controller.js';
import { createRecord } from './create/admin_panel.controller.js';
import { updateRecord } from './update/admin_panel.controller.js';
import { deleteRecord, deleteAllRecords } from './delete/admin_panel.controller.js';

const router = express.Router();
const canRead  = authorize('admin.panel.access');
const canWrite = authorize('admin.panel.manage');

// Dashboard stats — must be before /:resource to avoid being shadowed
router.get('/stats', canRead, getStats);

// Composite-ID models (2-part key): must come before /:resource/:id
router.get('/:resource/:p1/:p2',    canRead,  getRecord);
router.put('/:resource/:p1/:p2',    canWrite, updateRecord);
router.delete('/:resource/:p1/:p2', canWrite, deleteRecord);

// Simple-ID models
router.get('/:resource',        canRead,  listRecords);
router.post('/:resource',       canWrite, createRecord);
router.delete('/:resource',     canWrite, deleteAllRecords);   // DELETE ALL rows
router.get('/:resource/:id',    canRead,  getRecord);
router.put('/:resource/:id',    canWrite, updateRecord);
router.delete('/:resource/:id', canWrite, deleteRecord);

export default router;
