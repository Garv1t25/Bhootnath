import express from "express";
import rateLimit from "express-rate-limit";
import {
  createStaffUser,
  getCurrentUser,
  listUsers,
  login,
  logout,
  updateStaffUser,
} from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." },
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);
router.get("/users", requireAuth, requireRole("admin"), listUsers);
router.post("/users", requireAuth, requireRole("admin"), createStaffUser);
router.patch("/users/:id", requireAuth, requireRole("admin"), updateStaffUser);

export default router;
