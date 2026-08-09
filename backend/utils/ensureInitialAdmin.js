import bcrypt from "bcryptjs";
import { User } from "../models/User.model.js";

export const ensureInitialAdmin = async () => {
  const hasUsers = await User.exists({});

  if (hasUsers) {
    return;
  }

  const email = String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = String(process.env.ADMIN_NAME ?? "Owner").trim() || "Owner";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to create the first admin account.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    name,
    email,
    passwordHash,
    role: "admin",
  });

  console.log(`Initial admin account created for ${email}.`);
};
