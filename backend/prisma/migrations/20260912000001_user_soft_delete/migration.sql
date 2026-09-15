-- Soft-delete flag for user accounts. A deleted account keeps its row (and
-- every FK reference to it) but rbac.service.js's listUsers() filters it out
-- of the main app's User Roles page; only admin_panel's generic Users
-- resource (no row filtering) can see and restore it.
ALTER TABLE "users" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMPTZ;
