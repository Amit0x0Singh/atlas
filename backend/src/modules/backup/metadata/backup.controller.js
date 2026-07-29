import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';

// Lets the frontend build its module/table pickers without duplicating the
// 85-row model list a third time — labels/colors for `group` are resolved
// client-side from the admin panel's own NAV_GROUPS.
export const getTablesMetadata = async (req, res) => {
  const tables = Object.entries(MODELS).map(([key, m]) => ({ key, model: m.model, group: m.group }));
  res.json({ success: true, data: { tables } });
};
