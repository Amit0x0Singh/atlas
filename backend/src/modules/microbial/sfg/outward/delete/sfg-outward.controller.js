import prisma from '../../../../../db.js'

// Discards an in-progress issuance session (user chose to abandon it rather
// than resume) — the caller is also responsible for clearing the task's
// microbeIssueStarted flag so it reappears in the picker.
export const deleteOutwardSession = async (req, res) => {
  try {
    await prisma.microbialSfgOutwardSession.delete({ where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (err) {
    // Already deleted / never existed — caller's intent (gone) is satisfied
    return res.json({ success: true })
  }
}
