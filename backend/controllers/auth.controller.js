import bcrypt from "bcryptjs";
import { User } from "../models/User.model.js";
import {
  AUTH_COOKIE_NAME,
  createAccessToken,
  getAuthCookieOptions,
  toPublicUser,
} from "../utils/auth.js";

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

export const login = async (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    const passwordMatches = user && await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches || !user.isActive) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createAccessToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(true));

    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("Unable to sign in:", error);
    return res.status(500).json({ message: "Unable to sign in right now." });
  }
};

export const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  return res.status(204).send();
};

export const getCurrentUser = (req, res) => res.status(200).json({ user: toPublicUser(req.user) });

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, createdAt: 1 });
    return res.status(200).json({ users: users.map(toPublicUser) });
  } catch (error) {
    console.error("Unable to load users:", error);
    return res.status(500).json({ message: "Unable to load users right now." });
  }
};

export const createStaffUser = async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name ?? "").trim();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters long." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const existingUser = await User.exists({ email });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "staff",
    });

    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("Unable to create staff user:", error);
    return res.status(500).json({ message: "Unable to create the staff user right now." });
  }
};

export const updateStaffUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+passwordHash");

    if (!user || user.role !== "staff") {
      return res.status(404).json({ message: "Staff user not found." });
    }

    const body = req.body || {};
    const { isActive } = body;
    const password = body.password;
    let shouldRevokeSessions = false;

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be true or false." });
      }
      shouldRevokeSessions = user.isActive !== isActive;
      user.isActive = isActive;
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
      }
      user.passwordHash = await bcrypt.hash(password, 12);
      shouldRevokeSessions = true;
    }

    if (isActive === undefined && password === undefined) {
      return res.status(400).json({ message: "No account changes were provided." });
    }

    if (shouldRevokeSessions) {
      user.sessionVersion += 1;
    }

    await user.save();
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("Unable to update staff user:", error);
    return res.status(500).json({ message: "Unable to update the staff user right now." });
  }
};
