require('dotenv').config({ path: '.env.local' });
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded" : "Not loaded");

async function checkTables() {
  try {
    console.log("Checking transactions table...");
    const transactionsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'transactions'
    `);

    if (transactionsResult.rows.length > 0) {
      console.log("✅ Table 'transactions' exists");

      // Check table structure
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        ORDER BY ordinal_position
      `);

      console.log("Transactions table columns:");
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

    } else {
      console.log("❌ Table 'transactions' does not exist");
      return false;
    }

    console.log("\nChecking transaction_details table...");
    const detailsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'transaction_details'
    `);

    if (detailsResult.rows.length > 0) {
      console.log("✅ Table 'transaction_details' exists");
    } else {
      console.log("❌ Table 'transaction_details' does not exist");
      return false;
    }

    return true;

  } catch (error) {
    console.error("Database check failed:", error);
    return false;
  } finally {
    await pool.end();
  }
}

checkTables();