require("dotenv").config();

const express = require("express");
const cron = require("node-cron");
const { runRenewal } = require("./renewal");

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 5055);
const CRON_TZ = process.env.CRON_TZ || "Asia/Jakarta";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "10 0 * * *";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

app.get("/health", (req, res) => {
    res.json({ ok: true, service: "quota-renewal-service" });
});

// Manual trigger (protected)
app.post("/admin/renew", async (req, res) => {
    const key = req.header("x-api-key") || "";
    if (!ADMIN_API_KEY || key !== ADMIN_API_KEY) {
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    try {
        const result = await runRenewal();
        res.json({ ok: true, ...result });
    } catch (err) {
        console.error("Manual renewal error:", err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// Cron job
cron.schedule(
    CRON_SCHEDULE,
    async () => {
        try {
            const result = await runRenewal();
            console.log(
                `[CRON] renewal done: affectedRows=${result.affectedRows} mode=${result.mode} table=${result.table}`
            );
        } catch (err) {
            console.error("[CRON] renewal error:", err);
        }
    },
    { timezone: CRON_TZ }
);

app.listen(PORT, () => {
    console.log(`quota-renewal-service running on :${PORT}`);
    console.log(`cron schedule: "${CRON_SCHEDULE}" TZ=${CRON_TZ}`);
});