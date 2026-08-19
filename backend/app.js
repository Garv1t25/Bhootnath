import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.route.js";
import customerRouter from "./routes/customer.route.js";

const app = express();
const defaultOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"];
const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;
const isProduction = process.env.NODE_ENV === "production";

// Behind a reverse proxy (nginx, Render, Railway, ...) so rate limits and
// secure cookies see the real client IP.
app.set("trust proxy", isProduction ? 1 : false);

app.use(helmet());

const corsMiddleware = cors({ credentials: true });

app.use((req, res, next) => {
  const origin = req.headers.origin;
  let isSameOrigin = false;
  if (origin && req.headers.host) {
    try {
      isSameOrigin = new URL(origin).host === req.headers.host;
    } catch {
      isSameOrigin = false;
    }
  }

  if (!origin || !isProduction || isSameOrigin || allowedOrigins.includes(origin)) {
    return corsMiddleware(req, res, next);
  }

  return res.status(403).json({ message: "Origin is not allowed by CORS." });
});
app.use(express.json({limit : "16kb"}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in 15 minutes." },
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRouter);
app.use("/api/customers", customerRouter);
app.get("/test", (req, res) => {
  res.send("All good!!!");
});
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK"
    });
});

if (isProduction) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(
    __dirname,
    process.env.FRONTEND_DIST || "../restaurant-tracker/dist"
  );
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

export default app;
