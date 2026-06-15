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
  agent_id?: string;
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
  const authToken = process.env.CREDIT_MANAGER_AUTH_TOKEN;
  if (!authToken) throw new Error("CREDIT_MANAGER_AUTH_TOKEN is not configured");

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

    const transactions = data?.data?.data ?? data?.data ?? data?.transactions ?? [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      break;
    }

    allTransactions.push(...transactions);

    if (transactions.length < limit) {
      break;
    }

    page++;

    if (page > 1000) {
      console.warn("Reached maximum page limit (1000), stopping pagination");
      break;
    }
  }

  return allTransactions;
}

async function upsertTransaction(transaction: TransactionFromAPI): Promise<void> {
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
    transaction.agent_id,
    transaction.amount,
    transaction.user_product_id,
    transaction.product_name,
    transaction.product_package,
    transaction.type,
    transaction.user_id,
    transaction.action_id,
    new Date(),
  ];

  await pool.query(query, values);
}

export async function POST(request: Request) {
  try {
    console.log("Starting credit manager transactions sync v2...");

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not configured");
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { start_date, end_date } = body as { start_date?: string; end_date?: string };

    const today = new Date().toISOString().split('T')[0];

    let resolvedStartDate = start_date;
    let resolvedEndDate = end_date || today;

    if (!resolvedStartDate) {
      const lastDate = await getLastTransactionDate();
      resolvedStartDate = lastDate ? new Date(lastDate).toISOString().split('T')[0] : '2024-01-01';
      console.log("No start_date provided, using last DB date:", resolvedStartDate);
    }

    console.log(`Syncing transactions from ${resolvedStartDate} to ${resolvedEndDate}`);

    const transactions = await fetchTransactionsFromAPI(resolvedStartDate, resolvedEndDate);
    console.log(`Fetched ${transactions.length} transactions from API`);

    if (transactions.length === 0) {
      console.warn("No transactions fetched from API");
      return NextResponse.json({
        status: "sync_completed",
        total_processed: 0,
        success_count: 0,
        error_count: 0,
        message: "No new transactions to sync",
        start_date: resolvedStartDate,
        end_date: resolvedEndDate,
      });
    }

    console.log("Testing database connection...");
    await pool.query('SELECT 1');
    console.log("Database connection OK");

    console.log("Starting upsert process...");
    const results: Array<{ id?: string; status: string; error?: string }> = [];
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
      start_date: resolvedStartDate,
      end_date: resolvedEndDate,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync v2 error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
