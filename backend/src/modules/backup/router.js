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
  // (see backup-excel-import.service.js). Extension only — file.mimetype is
  // client-supplied and, worse, unreliable: Windows has no default MIME
  // registration for .gz, so browsers there report an empty mimetype and a
  // combined extension+MIME gate silently dropped every legitimate upload
  // (multer's fileFilter cb(null, false) rejects with no error, so it just
  // looked like the request vanished). Real content validation already
  // happens in validateBackupFile() (gunzip + JSON.parse) before anything
  // is trusted, so this is just an early, cheap sanity check.
  fileFilter: (req, file, cb) => {
    cb(null, /\.(json\.gz|gz|xlsx)$/i.test(file.originalname));
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
