import express from 'express';
import multer from 'multer';
import path from 'path';
import { createBackup } from './create/backup.controller.js';
import {
  listBackups, getBackupDetails, getBackupStatus, getRestoreStatus, listRestoresForBackup,
} from './get/backup.controller.js';
import { downloadBackup, downloadBackupExcel } from './download/backup.controller.js';
import { restoreFromHistory, restoreFromUpload } from './restore/backup.controller.js';
import { deleteBackup } from './delete/backup.controller.js';
import { getTablesMetadata } from './metadata/backup.controller.js';
import { INCOMING_DIR, ensureStorageDirs } from './utils/storage-paths.js';

ensureStorageDirs();

// Dedicated disk-storage multer instance — the shared memory-storage `upload`
// used elsewhere (50MB Excel import cap) would buffer a whole backup file in
// process memory, which doesn't scale for this feature.
const restoreUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, INCOMING_DIR),
    // path.basename strips any directory component — file.originalname is
    // client-controlled, and multer's disk storage path.join()s this
    // straight into the destination dir, so an unsanitized name like
    // "../../../evil.gz" would otherwise write outside INCOMING_DIR.
    filename: (req, file, cb) => cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  // .gz — the original backup format (preferred, exact); .xlsx — a
  // previously-exported "Export to Excel" file, reconstructed best-effort
  // (see backup-excel-import.service.js). Extension + MIME type together —
  // both are client-supplied and spoofable, but raise the bar over
  // extension alone; full magic-byte sniffing would be excessive for this
  // authenticate+adminOnly-gated, non-public upload surface.
  fileFilter: (req, file, cb) => {
    const extOk = /\.(json\.gz|gz|xlsx)$/i.test(file.originalname);
    const mimeOk = [
      'application/gzip',
      'application/x-gzip',
      'application/octet-stream',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(file.mimetype);
    cb(null, extOk && mimeOk);
  },
});

const router = express.Router();

// Literal-path routes declared before the `/:id` family so they can never be
// shadowed by it (mirrors AdminPanelRouter's own composite-vs-simple-id
// ordering discipline).
router.get('/tables', getTablesMetadata);
router.post('/upload/restore', restoreUpload.single('file'), restoreFromUpload);
router.get('/restore/:id/status', getRestoreStatus);

router.get('/', listBackups);
router.post('/', createBackup);
router.get('/:id', getBackupDetails);
router.get('/:id/status', getBackupStatus);
router.get('/:id/restores', listRestoresForBackup);
router.get('/:id/download', downloadBackup);
router.get('/:id/download/excel', downloadBackupExcel);
router.post('/:id/restore', restoreFromHistory);
router.delete('/:id', deleteBackup);

export default router;
