import cron from "node-cron";


cron.schedule("*/5 * * * *", async () => {
    await fetch("https://bhootnath.onrender.com/health");
});