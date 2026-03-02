import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

type TransactionFromAPI = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  agent?: string;
  amount?: number;
  user_product_id?: string;
  product_name?: string;
  product_package?: string;
  type?: string;
  user_id?: string;
  action_id?: string;
};

async function getLastTransactionDate(): Promise<string | null> {
  const query = `
    SELECT MAX(created_at) as last_date
    FROM credit_manager_transactions
  `;
  const result = await pool.query(query);
  return result.rows[0]?.last_date || null;
}

async function fetchTransactionsFromAPI(startDate: string, endDate: string): Promise<TransactionFromAPI[]> {
  const url = "https://credit-manager.mwxmarket.ai/api/v1/transactions";
  const authToken = "T9S6shs05E4KFXWafsM4eICehFSz/ISbT96/35WRLClsSLcMbdESJjL7lWKCl3NCnqZcSSd8qvQEuG0x8k2Grg==";

  const allTransactions: TransactionFromAPI[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      start_date: startDate,
      end_date: endDate,
    });

    const fullUrl = `${url}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": authToken,
        "X-API-KEY": authToken,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // API returns { success, message, data: { data: TransactionFromAPI[], page, limit, total_count } }
    const transactions = data?.data?.data ?? data?.data ?? data?.transactions ?? [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      break; // No more data
    }

    allTransactions.push(...transactions);

    // If we got fewer results than the limit, we've reached the end
    if (transactions.length < limit) {
      break;
    }

    page++;

    // Safety check to prevent infinite loops
    if (page > 1000) {
      console.warn("Reached maximum page limit (1000), stopping pagination");
      break;
    }
  }

  return allTransactions;
}

async function upsertTransaction(transaction: TransactionFromAPI): Promise<void> {
  // Skip transactions without id as it's used as the primary identifier
  if (!transaction.id || transaction.id.trim() === '') {
    throw new Error('Transaction id is required for upsert operation');
  }

  const query = `
    INSERT INTO credit_manager_transactions (
      id, created_at, updated_at, agent, amount, user_product_id,
      product_name, product_package, type, user_id, action_id, inserted_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    ON CONFLICT (id)
    DO UPDATE SET
      updated_at = EXCLUDED.updated_at,
      agent = EXCLUDED.agent,
      amount = EXCLUDED.amount,
      user_product_id = EXCLUDED.user_product_id,
      product_name = EXCLUDED.product_name,
      product_package = EXCLUDED.product_package,
      type = EXCLUDED.type,
      user_id = EXCLUDED.user_id,
      action_id = EXCLUDED.action_id
  `;

  const values = [
    transaction.id,
    transaction.created_at ? new Date(transaction.created_at) : null,
    transaction.updated_at ? new Date(transaction.updated_at) : new Date(),
    transaction.agent,
    transaction.amount,
    transaction.user_product_id,
    transaction.product_name,
    transaction.product_package,
    transaction.type,
    transaction.user_id,
    transaction.action_id,
    new Date(), // inserted_at
  ];

  await pool.query(query, values);
}

export async function GET() {
  try {
    // Test the API connection
    console.log("Testing Credit Manager API connection...");

    const lastDate = await getLastTransactionDate();
    console.log("Last transaction date in database:", lastDate);

    const startDate = lastDate ? new Date(lastDate).toISOString().split('T')[0] : '2024-01-01';
    const endDate = new Date().toISOString().split('T')[0];

    console.log(`Fetching transactions from ${startDate} to ${endDate}`);

    const transactions = await fetchTransactionsFromAPI(startDate, endDate);
    console.log(`Fetched ${transactions.length} transactions from API`);

    return NextResponse.json({
      status: "api_test_success",
      message: "Credit Manager API connection successful",
      transaction_count: transactions.length,
      last_db_date: lastDate,
      start_date: startDate,
      end_date: endDate,
      sample_transaction: transactions[0] || null,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("API Test error:", error);
    return NextResponse.json({
      error: message,
      status: "error"
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log("Starting credit manager transactions sync process...");

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not configured");
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    // Get the last transaction date
    const lastDate = await getLastTransactionDate();
    console.log("Last transaction date in database:", lastDate);

    // Determine start date
    const startDate = lastDate ? new Date(lastDate).toISOString().split('T')[0] : '2024-01-01';
    const endDate = new Date().toISOString().split('T')[0];

    console.log(`Syncing transactions from ${startDate} to ${endDate}`);

    // Fetch transactions from API
    const transactions = await fetchTransactionsFromAPI(startDate, endDate);
    console.log(`Fetched ${transactions.length} transactions from API`);

    if (transactions.length === 0) {
      console.warn("No transactions fetched from API");
      return NextResponse.json({
        status: "sync_completed",
        total_processed: 0,
        message: "No new transactions to sync",
        last_db_date: lastDate,
        start_date: startDate,
        end_date: endDate,
      });
    }

    // Check database connection
    console.log("Testing database connection...");
    await pool.query('SELECT 1');
    console.log("Database connection OK");

    // Upsert each transaction into the database
    console.log("Starting upsert process...");
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      try {
        if (i % 50 === 0) {
          console.log(`Processing transaction ${i + 1}/${transactions.length}...`);
        }

        await upsertTransaction(transaction);
        results.push({ id: transaction.id, status: "success" });
        successCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error upserting transaction ${transaction.id}:`, message);
        results.push({ id: transaction.id, status: "error", error: message });
        errorCount++;
      }
    }

    console.log(`Sync completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      status: "sync_completed",
      total_processed: transactions.length,
      success_count: successCount,
      error_count: errorCount,
      last_db_date: lastDate,
      start_date: startDate,
      end_date: endDate,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
