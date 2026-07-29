import { resolveDeleteScope, computeImpact } from '../utils/delete-impact.js';

// Read-only — safe to call repeatedly as the admin adjusts scope in the UI.
export const previewImpact = async (req, res) => {
  try {
    const scope = resolveDeleteScope(req.body ?? {});
    const impact = await computeImpact(scope);
    return res.json({ success: true, data: { scopeTables: scope.scopeTables, ...impact } });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
};
