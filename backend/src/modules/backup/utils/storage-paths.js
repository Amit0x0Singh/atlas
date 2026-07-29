import path from 'path';
import fs from 'fs';

export const BACKUPS_DIR = path.join(process.cwd(), 'storage', 'backups');
export const INCOMING_DIR = path.join(BACKUPS_DIR, 'incoming');
export const RESTORED_UPLOADS_DIR = path.join(BACKUPS_DIR, 'restored-uploads');

export function ensureStorageDirs() {
  for (const dir of [BACKUPS_DIR, INCOMING_DIR, RESTORED_UPLOADS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
