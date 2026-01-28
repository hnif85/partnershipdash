import { NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    console.log("Checking database tables...");

    // Check transactions table
    const transactionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'transactions'
    `);

    const transactionsExists = transactionsResult.rows[0].count > 0;

    // Check transaction_details table
    const detailsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'transaction_details'
    `);

    const detailsExists = detailsResult.rows[0].count > 0;

    // Check cms_customers table (dependency)
    const customersResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'cms_customers'
    `);

    const customersExists = customersResult.rows[0].count > 0;

    // If tables don't exist, try to create them
    let created = false;
    if (!transactionsExists || !detailsExists) {
      console.log("Tables missing, attempting to create...");

      await pool.query(`
        -- Create transactions table
        CREATE TABLE IF NOT EXISTS transactions (
          guid TEXT PRIMARY KEY,
          invoice_number TEXT,
          customer_guid TEXT,
          transaction_callback_id TEXT,
          status TEXT,
          payment_channel_id TEXT,
          payment_channel_code TEXT,
          payment_channel_name TEXT,
          payment_url TEXT,
          qty INTEGER,
          valuta_code TEXT,
          sub_total NUMERIC,
          platform_fee NUMERIC,
          payment_service_fee NUMERIC,
          total_discount NUMERIC,
          grand_total NUMERIC,
          created_at TIMESTAMP WITH TIME ZONE,
          created_by_guid TEXT,
          created_by_name TEXT,
          updated_at TIMESTAMP WITH TIME ZONE,
          updated_by_guid TEXT,
          updated_by_name TEXT
        );
      `);

      await pool.query(`
        -- Create transaction_details table
        CREATE TABLE IF NOT EXISTS transaction_details (
          guid TEXT PRIMARY KEY,
          transaction_guid TEXT,
          merchant_guid TEXT,
          merchant_store_name TEXT,
          product_name TEXT,
          product_price NUMERIC,
          purchase_type_id TEXT,
          purchase_type_name TEXT,
          purchase_type_value TEXT,
          qty INTEGER,
          total_discount NUMERIC,
          grand_total NUMERIC
        );
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_customer_guid ON transactions(customer_guid);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON transactions(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_transaction_detail_transaction_guid ON transaction_details(transaction_guid);
      `);

      created = true;
      console.log("Tables created successfully");
    }

    // Get table counts
    let transactionsCount = 0;
    let detailsCount = 0;

    if (transactionsExists || created) {
      const countResult = await pool.query("SELECT COUNT(*) as count FROM transactions");
      transactionsCount = parseInt(countResult.rows[0].count);
    }

    if (detailsExists || created) {
      const countResult = await pool.query("SELECT COUNT(*) as count FROM transaction_details");
      detailsCount = parseInt(countResult.rows[0].count);
    }

    return NextResponse.json({
      status: "success",
      tables: {
        transactions: {
          exists: transactionsExists || created,
          record_count: transactionsCount
        },
        transaction_details: {
          exists: detailsExists || created,
          record_count: detailsCount
        },
        cms_customers: {
          exists: customersExists
        }
      },
      created: created
    });

  } catch (error) {
    console.error("Table check error:", error);
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log("Creating tables...");

    await pool.query(`
      -- Create transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        guid TEXT PRIMARY KEY,
        invoice_number TEXT,
        customer_guid TEXT,
        transaction_callback_id TEXT,
        status TEXT,
        payment_channel_id TEXT,
        payment_channel_code TEXT,
        payment_channel_name TEXT,
        payment_url TEXT,
        qty INTEGER,
        valuta_code TEXT,
        sub_total NUMERIC,
        platform_fee NUMERIC,
        payment_service_fee NUMERIC,
        total_discount NUMERIC,
        grand_total NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE,
        created_by_guid TEXT,
        created_by_name TEXT,
        updated_at TIMESTAMP WITH TIME ZONE,
        updated_by_guid TEXT,
        updated_by_name TEXT
      );
    `);

    await pool.query(`
      -- Create transaction_details table
      CREATE TABLE IF NOT EXISTS transaction_details (
        guid TEXT PRIMARY KEY,
        transaction_guid TEXT,
        merchant_guid TEXT,
        merchant_store_name TEXT,
        product_name TEXT,
        product_price NUMERIC,
        purchase_type_id TEXT,
        purchase_type_name TEXT,
        purchase_type_value TEXT,
        qty INTEGER,
        total_discount NUMERIC,
        grand_total NUMERIC
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_customer_guid ON transactions(customer_guid);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON transactions(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_transaction_detail_transaction_guid ON transaction_details(transaction_guid);
    `);

    console.log("Tables created successfully");

    return NextResponse.json({
      status: "success",
      message: "Tables created successfully"
    });

  } catch (error) {
    console.error("Table creation error:", error);
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
