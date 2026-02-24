const { getPool } = require("./db");

function getNextResetExpr(mode) {
    if (mode === "days30") return "DATE_ADD(reset_date, INTERVAL 30 DAY)";
    // default "month"
    return "DATE_ADD(reset_date, INTERVAL 1 MONTH)";
}

async function runRenewal() {
    const pool = getPool();
    const table = process.env.DB_TABLE || "networking_quotas";
    const mode = (process.env.RENEWAL_MODE || "month").toLowerCase();
    const nextResetExpr = getNextResetExpr(mode);

    // Safety: jangan sampai infinite kalau reset_date jauh di masa lalu.
    // Kalau kamu mau “catch up” berkali-kali sampai future, kita bisa tambah loop,
    // tapi versi ini: cukup maju 1 periode tiap run (harian).
    const sql = `
    UPDATE \`${table}\`
    SET
      used_quota = 0,
      reset_date = ${nextResetExpr},
      updated_at = CURRENT_TIMESTAMP
    WHERE reset_date IS NOT NULL
      AND reset_date <= CURDATE()
  `;

    const [result] = await pool.query(sql);
    return {
        affectedRows: result.affectedRows || 0,
        mode,
        table
    };
}

module.exports = { runRenewal };