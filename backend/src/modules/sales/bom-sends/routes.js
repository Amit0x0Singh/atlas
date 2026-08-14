import { Router } from "express";
import { authorize } from "../../../middleware/auth.js";
import { getBomSends, getBomSend } from "./get/bom-sends.controller.js";
import {
  createBomSend,
  issuePackToBomSend,
} from "./create/sales.controller.js";
import { updateBomSendStatus } from "./update/sales.controller.js";
import { deleteBomSend } from "./delete/sales.controller.js";

//---------------------  Router ---------------------

const router = Router();

router.get("/", authorize("sales.bom-send.view"), getBomSends);
router.get("/:id", authorize("sales.bom-send.view"), getBomSend);

router.post("/", authorize("sales.bom-send.create"), createBomSend);
router.post("/:id/issue-pack", authorize("sales.bom-send.issue"), issuePackToBomSend);

router.patch("/:id/status", authorize("sales.bom-send.update"), updateBomSendStatus);

router.delete("/:id", authorize("sales.bom-send.delete"), deleteBomSend);

export default router;
