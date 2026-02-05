import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { mwxAuth } from "@/lib/mwxAuth";

interface TransactionFromAPI {
  guid: string;
  invoice_number: string;
  customer: {
    guid: string;
    full_name?: string;
    username?: string;
    email?: string;
  };
  transaction_callback_id: string;
  status: string;
  payment_channel: {
    id: string;
    code: string;
    payment_name: string;
  };
  payment_url: string;
  qty: number;
  valuta_code: string;
  sub_total: number;
  platform_fee: number;
  payment_service_fee: number;
  total_discount: number;
  grand_total: number;
  transaction_detail: Array<{
    guid: string;
    grand_total: number;
    merchant: {
      guid: string;
      store_name: string;
    };
    product_name: string;
    product_price: number;
    purchase_type: {
      id: string;
      name: string;
      value: string;
    };
    qty: number;
    total_discount: number;
    transaction_id: string;
  }>;
  created_at: string;
  created_by: {
    guid: string;
    name: string;
  };
}

// Sanitize string fields to avoid encoding issues with non-ASCII characters
function sanitize(value: any): any {
  if (typeof value === "string") {
    // Replace characters outside Latin1 with '?'
    return value.replace(/[^\u0000-\u00FF]/g, "?");
  }
  return value;
}

async function syncTransactionsFromAPI(
  startDate?: string,
  endDate?: string,
  customerGuid?: string,
  status?: string
): Promise<{ transactions: TransactionFromAPI[] }> {
  const url = "https://api-mwxmarket.mwxmarket.ai/transaction-service/transaction/external/list";

  // No token or refresh needed for external API

  const apiKey = "8wHKXjrO/LtJ92zCyXHelt8gzlXKIfUDAn40/AkCf2cer7rreV4lOKdJXij42XVcCn6P4/ekaWHDkTHWEPUpHGwe";
  const baseHeaders = {
    "x-api-key": apiKey,
    "Content-Type": "application/json"
  };

  const allTransactions: TransactionFromAPI[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const body = {
      "filter": {
        "set_guid": false,
        "guid": "",
        "set_status": false,
        "status": status || "finished",
        "set_merchant": false,
        "merchant_id": "",
        "set_category": false,
        "category": "",
        "set_name": false,
        "name": "",
        "set_transaction_at": true,
        "start_date": startDate ? `${startDate}T00:00:00` : "2025-10-01T00:00:00",
        "end_date": endDate ? `${endDate}T23:59:59` : "2025-10-31T23:59:59",
        "set_valuta": false,
        "valuta": "USD",
        "set_customer_id": !!customerGuid,
        "customer_id": customerGuid || "",
        "set_email": false,
        "email": ""
      },
      "limit": limit,
      "page": page,
      "order": "created_at",
      "sort": "DESC"
    };

    const headers = {
      ...baseHeaders
    };

    let response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response text (first 200 chars):', responseText.substring(0, 200));
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response is empty
    if (!responseText.trim()) {
      throw new Error(`API returned empty response (status: ${response.status})`);
    }

    // Check if response might be HTML or plain text error
    if (!responseText.trim().startsWith('{')) {
      console.error('API returned non-JSON response:', responseText.substring(0, 500));
      throw new Error(`API returned non-JSON response (status: ${response.status}): ${responseText.substring(0, 200)}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Full response text that failed parsing:', responseText);
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse API response: ${errorMessage}. Response: ${responseText.substring(0, 500)}`);
    }

    console.log(`Fetched page ${page}, response code:`, data.response?.code);

    if (data.response?.code !== "00" || data.response?.status !== "success") {
      throw new Error(`API returned error: ${data.response?.message_en || "Unknown error"}`);
    }

    const transactions = data.response?.data || [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      break; // No more data
    }

    allTransactions.push(...transactions);

    // Check if we've reached the last page
    const currentPage = data.response?.current_page || 1;
    const totalPages = data.response?.total_page || 1;

    if (currentPage >= totalPages) {
      break;
    }

    page++;
  }

  return { transactions: allTransactions };
}

async function upsertTransaction(transaction: TransactionFromAPI): Promise<void> {
  // Skip transactions without guid
  if (!transaction.guid || transaction.guid.trim() === '') {
    throw new Error('Transaction guid is required');
  }

  console.log('Processing transaction:', transaction.guid);
  console.log('Transaction data:', JSON.stringify(transaction, null, 2));

  const query = `
    INSERT INTO transactions (
      guid, invoice_number, customer_guid, transaction_callback_id, status,
      payment_channel_id, payment_channel_code, payment_channel_name, payment_url,
      qty, valuta_code, sub_total, platform_fee, payment_service_fee,
      total_discount, grand_total, created_at, created_by_guid, created_by_name
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
    ON CONFLICT (guid)
    DO UPDATE SET
      invoice_number = EXCLUDED.invoice_number,
      customer_guid = EXCLUDED.customer_guid,
      transaction_callback_id = EXCLUDED.transaction_callback_id,
      status = EXCLUDED.status,
      payment_channel_id = EXCLUDED.payment_channel_id,
      payment_channel_code = EXCLUDED.payment_channel_code,
      payment_channel_name = EXCLUDED.payment_channel_name,
      payment_url = EXCLUDED.payment_url,
      qty = EXCLUDED.qty,
      valuta_code = EXCLUDED.valuta_code,
      sub_total = EXCLUDED.sub_total,
      platform_fee = EXCLUDED.platform_fee,
      payment_service_fee = EXCLUDED.payment_service_fee,
      total_discount = EXCLUDED.total_discount,
      grand_total = EXCLUDED.grand_total,
      updated_at = NOW()
  `;

  const values = [
    transaction.guid,
    transaction.invoice_number,
    transaction.customer?.guid || null,
    transaction.transaction_callback_id,
    transaction.status,
    transaction.payment_channel?.id || null,
    transaction.payment_channel?.code || null,
    transaction.payment_channel?.payment_name || null,
    transaction.payment_url,
    transaction.qty,
    transaction.valuta_code,
    transaction.sub_total,
    transaction.platform_fee,
    transaction.payment_service_fee,
    transaction.total_discount,
    transaction.grand_total,
    transaction.created_at ? new Date(transaction.created_at) : null,
    transaction.created_by?.guid || null,
    transaction.created_by?.name || null,
  ].map(sanitize);

  console.log('Inserting transaction:', transaction.guid);
  values.forEach((val, idx) => {
    if (typeof val === 'string') {
      console.log(`Value ${idx}: length=${val.length}, first 100 chars: ${val.substring(0, 100)}`);
      // Check for high Unicode chars
      const highChars = val.match(/[\u0100-\uFFFF]/g);
      if (highChars) {
        console.log(`High Unicode chars in value ${idx}:`, highChars);
      }
    } else {
      console.log(`Value ${idx}:`, val);
    }
  });

  try {
    await pool.query(query, values);
  } catch (dbError) {
    console.error('Database error:', dbError);
    throw dbError;
  }

  // Insert transaction details
  if (transaction.transaction_detail && Array.isArray(transaction.transaction_detail)) {
    for (const detail of transaction.transaction_detail) {
      try {
        await upsertTransactionDetail(detail, transaction.guid);
      } catch (detailError) {
        // Log detail error but continue with other details to avoid failing whole transaction
        console.error(`Failed to upsert transaction detail ${detail?.guid || "(no-guid)"} for txn ${transaction.guid}:`, detailError);
      }
    }
  }
}

async function upsertTransactionDetail(detail: TransactionFromAPI['transaction_detail'][0], parentGuid: string): Promise<void> {
  if (!detail?.guid) {
    console.warn("Skipping transaction detail with missing guid for transaction", parentGuid);
    return;
  }

  const query = `
    INSERT INTO transaction_details (
      guid, transaction_guid, merchant_guid, merchant_store_name, product_name,
      product_price, purchase_type_id, purchase_type_name, purchase_type_value,
      qty, total_discount, grand_total
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    ON CONFLICT (guid)
    DO UPDATE SET
      merchant_guid = EXCLUDED.merchant_guid,
      merchant_store_name = EXCLUDED.merchant_store_name,
      product_name = EXCLUDED.product_name,
      product_price = EXCLUDED.product_price,
      purchase_type_id = EXCLUDED.purchase_type_id,
      purchase_type_name = EXCLUDED.purchase_type_name,
      purchase_type_value = EXCLUDED.purchase_type_value,
      qty = EXCLUDED.qty,
      total_discount = EXCLUDED.total_discount,
      grand_total = EXCLUDED.grand_total
  `;

  const values = [
    detail.guid,
    detail.transaction_id || parentGuid,
    detail.merchant?.guid || null,
    detail.merchant?.store_name || null,
    detail.product_name,
    detail.product_price,
    detail.purchase_type?.id || null,
    detail.purchase_type?.name || null,
    detail.purchase_type?.value || null,
    detail.qty,
    detail.total_discount,
    detail.grand_total,
  ].map(sanitize);

  await pool.query(query, values);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const customerGuid = searchParams.get('customer_guid');
    const status = searchParams.get('status');

    console.log("Testing MWX transaction API connection...");

    // Test fetch first page only
    const url = "https://api-mwxmarket.mwxmarket.ai/transaction-service/transaction/external/list";

    const apiKey = "8wHKXjrO/LtJ92zCyXHelt8gzlXKIfUDAn40/AkCf2cer7rreV4lOKdJXij42XVcCn6P4/ekaWHDkTHWEPUpHGwe";
    const headers = {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    };

    const body = {
      "filter": {
        "set_guid": false,
        "guid": "",
        "set_status": false,
        "status": status || "finished",
        "set_merchant": false,
        "merchant_id": "",
        "set_category": false,
        "category": "",
        "set_name": false,
        "name": "",
        "set_transaction_at": true,
        "start_date": startDate || "2025-10-27T00:00:00",
        "end_date": endDate || "2025-10-28T23:59:59",
        "set_valuta": true,
        "valuta": "USD",
        "set_customer_id": !!customerGuid,
        "customer_id": customerGuid || "",
        "set_email": false,
        "email": ""
      },
      "limit": 10,
      "page": 1,
      "order": "created_at",
      "sort": "DESC"
    };

    const apiResponse = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("MWX Transaction API Error response:", errorText);
      return NextResponse.json({
        error: `MWX Transaction API request failed: ${apiResponse.status} ${apiResponse.statusText}`,
        details: errorText,
        status: "error"
      }, { status: 502 });
    }

    const data = await apiResponse.json();

    if (data.response?.code !== "00" || data.response?.status !== "success") {
      return NextResponse.json({
        status: "api_error",
        error: data.response?.message_en || "API returned error response",
        full_response: data
      }, { status: 502 });
    }

    const transactions = data.response?.data || [];
    const transactionCount = Array.isArray(transactions) ? transactions.length : 0;

    console.log(`Successfully fetched ${transactionCount} transactions from MWX API`);

    return NextResponse.json({
      status: "api_test_success",
      message: "MWX Transaction API connection successful",
      transaction_count: transactionCount,
      total_data: data.response?.total_data || 0,
      total_page: data.response?.total_page || 0,
      current_page: data.response?.current_page || 1,
      sample_transaction: transactions[0] || null,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Transaction API Test error:", error);
    return NextResponse.json({
      error: message,
      status: "error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { startDate, endDate, customerGuid, status } = body;

    console.log("Starting transaction sync process...", { startDate, endDate, customerGuid, status });

    // Jika tidak ada startDate yang dikirim, ambil dari tanggal terakhir di database
    if (!startDate) {
      try {
        console.log("Getting last transaction date from database...");
        const lastDateQuery = `
          SELECT MAX(created_at) as last_date
          FROM transactions
          WHERE created_at IS NOT NULL
        `;
        const lastDateResult = await pool.query(lastDateQuery);
        const lastDate = lastDateResult.rows[0]?.last_date;

        if (lastDate) {
          // Set start_date ke hari sebelumnya dari tanggal terakhir
          const lastDateObj = new Date(lastDate);
          lastDateObj.setDate(lastDateObj.getDate() - 1); // Hari sebelumnya
          startDate = lastDateObj.toISOString().split('T')[0]; // Format YYYY-MM-DD

          console.log(`Last transaction date: ${lastDate}, setting start_date to: ${startDate}`);
        } else {
          // Jika tidak ada data di table, set start_date ke beberapa hari yang lalu
          const defaultStartDate = new Date();
          defaultStartDate.setDate(defaultStartDate.getDate() - 30); // 30 hari ke belakang
          startDate = defaultStartDate.toISOString().split('T')[0];

          console.log(`No transactions found, setting default start_date to: ${startDate}`);
        }
      } catch (dateError) {
        console.error("Error getting last transaction date:", dateError);
        // Fallback ke default
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 7);
        startDate = defaultStartDate.toISOString().split('T')[0];
      }
    }

    // Set end_date ke hari ini jika tidak disediakan
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
      console.log(`Setting end_date to today: ${endDate}`);
    }

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not configured");
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    console.log("Fetching transactions from MWX API...");
    const syncResult = await syncTransactionsFromAPI(startDate, endDate, customerGuid, status);
    const transactions = syncResult.transactions;

    console.log(`Fetched ${transactions.length} transactions from MWX API`);

    if (transactions.length > 0) {
      console.log('Sample transaction:', JSON.stringify(transactions[0], null, 2));
    }

    if (transactions.length === 0) {
      console.warn("No transactions fetched from MWX API");

      const successResponse = NextResponse.json({
        status: "sync_completed",
        total_processed: 0,
        message: "No transactions to sync",
        results: []
      });

      return successResponse;
    }

    // Check database connection
    console.log("Testing database connection...");
    await pool.query('SELECT 1');
    await pool.query("SET client_encoding = 'UTF8'");
    console.log("Database connection OK");

    // Upsert each transaction into the database
    console.log("Starting upsert process...");
    const results: Array<{ guid: string; status: "success" | "error"; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      try {
        if (i % 10 === 0) {
          console.log(`Processing transaction ${i + 1}/${transactions.length}...`);
        }

        await upsertTransaction(transaction);
        results.push({ guid: transaction.guid, status: "success" });
        successCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error upserting transaction ${transaction.guid}:`, message);
        console.error('Error details:', error);
        results.push({ guid: transaction.guid, status: "error", error: message });
        errorCount++;
      }
    }

    console.log(`Sync completed: ${successCount} success, ${errorCount} errors`);

    const errorSamples = results.filter((r) => r.status === "error").slice(0, 10);

    const successResponse = NextResponse.json({
      status: "sync_completed",
      total_processed: transactions.length,
      success_count: successCount,
      error_count: errorCount,
      results,
      errors: errorSamples,
      message: errorCount
        ? `Some transactions failed (${errorCount}). See 'errors' for details.`
        : "All transactions synced successfully."
    });

    return successResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Transaction sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
