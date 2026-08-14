import bcrypt from 'bcryptjs';
import prisma from '../../../db.js';

// "Prove you're still you" re-auth check before a destructive operation —
// compares against the freshly-loaded hash for the already-authenticated
// req.user, not a client-supplied identity.
export const verifyPassword = async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required.' });
  }

  const user = await prisma.user.findUnique({ where: { userId: req.user.userId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  return res.json({ success: true });
};
