import { Router } from "express";
import {
  getBomSends,
  getBomSend,
  createBomSend,
  issuePackToBomSend,
  updateBomSendStatus,
  deleteBomSend,
} from "./bom-sends.controller.js";

const router = Router();

router.get("/", getBomSends);
router.get("/:id", getBomSend);

router.post("/", createBomSend);
router.post("/:id/issue-pack", issuePackToBomSend);

router.patch("/:id/status", updateBomSendStatus);

router.delete("/:id", deleteBomSend);

export default router;
