import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "restaurant_tracker_token";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a value of at least 32 characters.");
  }

  return secret;
};

const getCookieDays = () => {
  const configuredDays = Number(process.env.JWT_COOKIE_DAYS);

  return Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 7;
};

export const validateAuthConfig = () => {
  getJwtSecret();
};

export const createAccessToken = (user) => jwt.sign(
  { role: user.role, sessionVersion: user.sessionVersion },
  getJwtSecret(),
  {
    subject: user._id.toString(),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  }
);

export const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret());

export const getAuthCookieOptions = (includeMaxAge = false) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  if (includeMaxAge) {
    options.maxAge = getCookieDays() * 24 * 60 * 60 * 1000;
  }

  return options;
};

export const toPublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});
