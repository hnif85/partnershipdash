require('dotenv').config({ path: '.env.local' });
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded" : "Not loaded");

async function checkCreditManagerTable() {
  try {
    console.log("Checking credit_manager_users table...");

    // Check if table exists
    const tableResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'credit_manager_users'
    `);

    if (tableResult.rows.length > 0) {
      console.log("✅ Table 'credit_manager_users' exists");

      // Check table structure
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'credit_manager_users'
        ORDER BY ordinal_position
      `);

      console.log("credit_manager_users table columns:");
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Get sample data
      console.log("\nFetching sample data (first 5 rows)...");
      const dataResult = await pool.query(`
        SELECT * FROM credit_manager_users
        ORDER BY created_at DESC
        LIMIT 5
      `);

      console.log(`Found ${dataResult.rows.length} rows`);
      if (dataResult.rows.length > 0) {
        console.log("Sample rows:");
        dataResult.rows.forEach((row, index) => {
          console.log(`Row ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      }

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total_rows FROM credit_manager_users
      `);
      console.log(`Total rows in table: ${countResult.rows[0].total_rows}`);

    } else {
      console.log("❌ Table 'credit_manager_users' does not exist");
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

checkCreditManagerTable();
