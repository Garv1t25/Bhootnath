import express from "express";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, recordPayment } from "../controllers/customer.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getCustomers);
router.post("/", addCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.post("/:id/payments", recordPayment);

export default router;
