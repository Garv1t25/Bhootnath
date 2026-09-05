import dotenv from "dotenv/config";
import "./jobs/jobs.js";
import connectDb from "./db/connectdb.js";
import app from "./app.js";
import { backfillCustomerActivities } from "./controllers/customer.controller.js";
import { ensureInitialAdmin } from "./utils/ensureInitialAdmin.js";
import { validateAuthConfig } from "./utils/auth.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  validateAuthConfig();
  await connectDb();
  await ensureInitialAdmin();
  await backfillCustomerActivities();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};



startServer().catch((error) => {
  console.error("Unable to start the server:", error.message);
  process.exit(1);
});
