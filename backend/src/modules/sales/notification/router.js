import { Router } from "express";
import { authorize } from "../../../middleware/auth.js";
import {
  getMyNotifications,
  getUnreadCount,
  getAllNotificationsAdmin,
  getDeliveryLog,
} from "./get/notification.controller.js";
import {
  markNotificationRead,
  markAllNotificationsRead,
  actionNotification,
} from "./update/notification.controller.js";

const router = Router();
// Personal inbox actions — any authenticated account can read/act on its
// own notifications; no module permission beyond being logged in.
const authenticatedOnly = authorize([]);

router.get("/", authenticatedOnly, getMyNotifications);
router.get("/unread-count", authenticatedOnly, getUnreadCount);
router.get("/admin/all", authorize("sales.notification.view"), getAllNotificationsAdmin);
router.get("/delivery-log", authorize("sales.notification.view"), getDeliveryLog);
router.patch("/read-all", authenticatedOnly, markAllNotificationsRead);
router.patch("/:id/read", authenticatedOnly, markNotificationRead);
router.patch("/:id/action", authenticatedOnly, actionNotification);

export default router;
