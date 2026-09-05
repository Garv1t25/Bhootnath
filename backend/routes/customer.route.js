import express from "express";
import {
  addCustomer,
  deleteCustomer,
  deleteCustomerHistoryActivity,
  getCustomerHistory,
  getCustomerHistoryExport,
  getCustomerStats,
  getCustomers,
  getCustomersExport,
  recordPayment,
  updateCustomer,
} from "../controllers/customer.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getCustomers);
router.get("/stats", getCustomerStats);
router.get("/export", getCustomersExport);
router.get("/history", getCustomerHistory);
router.get("/history/export", getCustomerHistoryExport);
router.delete("/history/:activityId", deleteCustomerHistoryActivity);
router.post("/", addCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.post("/:id/payments", recordPayment);

export default router;
