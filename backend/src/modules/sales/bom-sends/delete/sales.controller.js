import prisma from "../../../../db.js";
import { toSafeErrorMessage } from "../../../../utils/safe-error.js";

// DELETE /api/bom-sends/:id
const deleteBomSend = async (req, res) => {
  try {
    await prisma.bomSend.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

export { deleteBomSend };
