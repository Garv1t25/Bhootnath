import { User } from "../models/User.model.js";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  verifyAccessToken,
} from "../utils/auth.js";

export const requireAuth = async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive || payload.sessionVersion !== user.sessionVersion) {
      res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
      return res.status(401).json({ message: "Your session is no longer active." });
    }

    req.user = user;
    next();
  } catch {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to perform this action." });
  }

  next();
};
