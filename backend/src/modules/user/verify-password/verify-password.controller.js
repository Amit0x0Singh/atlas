import { findAccount } from '../../../../access.js';

// "Prove you're still you" re-auth check before a destructive operation —
// deliberately the same plain-text comparison login.controller.js already
// does. Not adding hashing here; that's a separate, pre-existing concern
// (access.js's whole account store is plain-text, flagged as temporary
// there already).
export const verifyPassword = async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required.' });
  }

  const account = findAccount(req.user.email);
  if (!account || account.password !== password) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  return res.json({ success: true });
};
