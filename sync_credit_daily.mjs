import { readFileSync } from "fs";
import pg from "pg";

const { Pool } = pg;

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf("=");
      if (idx === -1) return null;
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
    .filter(Boolean)
);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const AUTH_TOKEN =
  "T9S6shs05E4KFXWafsM4eICehFSz/ISbT96/35WRLClsSLcMbdESJjL7lWKCl3NCnqZcSSd8qvQEuG0x8k2Grg==";

function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchTransactions(start_date, end_date) {
  const all = [];
  let page = 1;
  const limit = 100;
  while (true) {
    const url = `https://credit-manager.mwxmarket.ai/api/v1/transactions?page=${page}&limit=${limit}&start_date=${start_date}&end_date=${end_date}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", Authorization: AUTH_TOKEN, "X-API-KEY": AUTH_TOKEN },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const txs = data?.data?.data ?? data?.data ?? data?.transactions ?? [];
    if (!Array.isArray(txs) || txs.length === 0) break;
    all.push(...txs);
    if (txs.length < limit) break;
    page++;
    if (page > 1000) break;
  }
  return all;
}

async function upsert(tx) {
  if (!tx.id) throw new Error("Missing id");
  const q = `
    INSERT INTO credit_manager_transactions
      (id, created_at, updated_at, agent, amount, user_product_id, product_name, product_package, type, user_id, action_id, inserted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (id) DO UPDATE SET
      updated_at=EXCLUDED.updated_at, agent=EXCLUDED.agent, amount=EXCLUDED.amount,
      user_product_id=EXCLUDED.user_product_id, product_name=EXCLUDED.product_name,
      product_package=EXCLUDED.product_package, type=EXCLUDED.type,
      user_id=EXCLUDED.user_id, action_id=EXCLUDED.action_id`;
  await pool.query(q, [
    tx.id,
    tx.created_at ? new Date(tx.created_at) : null,
    tx.updated_at ? new Date(tx.updated_at) : new Date(),
    tx.agent_id, tx.amount, tx.user_product_id,
    tx.product_name, tx.product_package, tx.type,
    tx.user_id, tx.action_id, new Date(),
  ]);
}

const start = new Date("2026-05-09");
const end = new Date("2026-05-15");

let totalOk = 0, totalErr = 0;
const dayResults = [];

let cur = new Date(start);
while (cur <= end) {
  const ds = formatYMD(cur);
  console.log(`\n--- ${ds} ---`);
  try {
    const txs = await fetchTransactions(ds, ds);
    console.log(`  Fetched ${txs.length} transactions`);
    let ok = 0, err = 0;
    for (const tx of txs) {
      try { await upsert(tx); ok++; } catch (e) { err++; }
    }
    dayResults.push({ date: ds, count: txs.length, success: ok, error: err });
    totalOk += ok;
    totalErr += err;
    console.log(`  Synced: ${ok} success, ${err} errors`);
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    dayResults.push({ date: ds, count: 0, success: 0, error: 0, errorMsg: e.message });
  }
  cur.setDate(cur.getDate() + 1);
}

console.log("\n=== DAILY SUMMARY ===");
console.table(dayResults);
console.log(`\nTotal: ${totalOk} success, ${totalErr} errors`);
await pool.end();
