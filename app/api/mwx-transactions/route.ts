import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { upsertCustomer } from "@/lib/cmsCustomers";
import { mwxAuth } from "@/lib/mwxAuth";

interface TransactionFromAPI {
  guid: string;
  invoice_number: string;
  customer: {
    guid: string;
    full_name?: string;
    username?: string;
    gender?: string;
    birth_date?: string;
    identity_number?: string;
    identity_img?: string;
    country_id?: number;
    country?: string;
    city_id?: number;
    city?: string;
    is_identity_verified?: boolean;
    bank_name?: string;
    bank_account_number?: string;
    bank_owner_name?: string;
    phone_number?: string;
    is_phone_number_verified?: boolean;
    email?: string;
    is_email_verified?: boolean;
    notification_un_read?: number;
    status?: string;
    corporate_name?: string;
    industry_name?: string;
    employee_qty?: string;
    solution_corporate_needs?: string[];
    merchant?: any;
    is_completed?: boolean;
    referal_code?: string;
    is_free_trial_use?: boolean;
    is_referal?: boolean;
    created_at?: string;
    created_by?: any;
    updated_at?: string;
    updated_by?: any;
  };
  transaction_callback_id: string;
  status: string;
  payment_channel: {
    code?: string;
    created_at?: string;
    created_by?: any;
    how_to_pay?: string;
    id?: string;
    logo_url?: string;
    payment_gateaway?: any;
    payment_method?: any;
    payment_name?: string;
    payment_service_fee?: number;
    platform_fee?: number;
    status_payment_channel?: boolean;
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
    grand_total: number;
    guid: string;
    merchant?: {
      background_img?: string;
      bank_account_number?: string;
      bank_name?: string;
      bank_owner_name?: string;
      created_at?: string;
      created_by?: any;
      description?: string;
      guid: string;
      is_official_store?: boolean;
      is_phone_number_verified?: boolean;
      is_verified_by_admin?: boolean;
      merchant_detail?: any;
      phone_number?: string;
      profile_picture?: string;
      status?: string;
      store_name?: string;
      updated_at?: string;
      updated_by?: any;
    };
    product_name: string;
    product_price: number;
    purchase_type?: any;
    qty: number;
    total_discount: number;
    transaction_id?: string;
  }>;
  transaction_id?: string;
}>;
transaction_details ?: Array<any>; // Fallback for plural field name
created_at: string;
created_by: any;
}

async function upsertTransaction(transaction: TransactionFromAPI): Promise<void> {
  // Debug logging for the first few transactions to understand structure
  if (Math.random() < 0.05) { // Log 5% of transactions
    console.log(`Processing transaction ${transaction.guid} keys:`, Object.keys(transaction));
    if ((transaction as any).transaction_details) {
      console.log(`Found 'transaction_details' in ${transaction.guid}, length: ${(transaction as any).transaction_details.length}`);
    }
    if (transaction.transaction_detail) {
      console.log(`Found 'transaction_detail' in ${transaction.guid}, length: ${transaction.transaction_detail.length}`);
    }
  }

  // Skip transactions without guid
  if (!transaction.guid || transaction.guid.trim() === '') {
    throw new Error('Transaction guid is required');
  }



  // First, save the customer data if it exists
  if (transaction.customer && transaction.customer.guid) {
    try {
      await upsertCustomer({
        guid: transaction.customer.guid,
        username: transaction.customer.username || '',
        full_name: transaction.customer.full_name || '',
        email: transaction.customer.email || '',
        phone_number: transaction.customer.phone_number || '',
        gender: transaction.customer.gender || '',
        birth_date: transaction.customer.birth_date,
        identity_number: transaction.customer.identity_number || '',
        identity_img: transaction.customer.identity_img || '',
        country_id: transaction.customer.country_id,
        country: transaction.customer.country || '',
        city_id: transaction.customer.city_id,
        city: transaction.customer.city || '',
        is_identity_verified: transaction.customer.is_identity_verified || false,
        bank_name: transaction.customer.bank_name || '',
        bank_account_number: transaction.customer.bank_account_number || '',
        bank_owner_name: transaction.customer.bank_owner_name || '',
        is_phone_number_verified: transaction.customer.is_phone_number_verified || false,
        is_email_verified: transaction.customer.is_email_verified || false,
        corporate_name: transaction.customer.corporate_name || '',
        industry_name: transaction.customer.industry_name || '',
        employee_qty: transaction.customer.employee_qty ? (isNaN(parseInt(transaction.customer.employee_qty)) ? undefined : parseInt(transaction.customer.employee_qty)) : undefined,
        solution_corporate_needs: Array.isArray(transaction.customer.solution_corporate_needs)
          ? transaction.customer.solution_corporate_needs.join(', ')
          : '',
        status: transaction.customer.status || 'active',
        referal_code: transaction.customer.referal_code || '',
        is_free_trial_use: transaction.customer.is_free_trial_use || false,
        created_at: transaction.customer.created_at || transaction.created_at,
        updated_at: transaction.customer.updated_at || transaction.created_at,
      });

    } catch (customerError) {
      console.error(`Error saving customer ${transaction.customer.guid}:`, customerError);
      // Continue with transaction even if customer save fails
    }
  }

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
    transaction.customer.guid,
    transaction.transaction_callback_id,
    transaction.status,
    transaction.payment_channel?.id,
    transaction.payment_channel?.code,
    transaction.payment_channel?.payment_name,
    transaction.payment_url,
    transaction.qty,
    transaction.valuta_code,
    transaction.sub_total,
    transaction.platform_fee,
    transaction.payment_service_fee,
    transaction.total_discount,
    transaction.grand_total,
    transaction.created_at ? new Date(transaction.created_at) : null,
    transaction.created_by?.guid,
    transaction.created_by?.name,
  ];


  await pool.query(query, values);

  // Insert transaction details (handle both singular and plural field names)
  const details = transaction.transaction_detail || transaction.transaction_details;

  if (details && Array.isArray(details)) {
    for (const detail of details) {
      await upsertTransactionDetail(transaction.guid, detail);
    }
  } else {
    // Log if no details found for a completed transaction
    if (transaction.status === 'finished') {
      console.log(`Warning: No details found for finished transaction ${transaction.guid}`);
    }
  }
}

async function upsertTransactionDetail(transactionGuid: string, detail: TransactionFromAPI['transaction_detail'][0]): Promise<void> {
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
    transactionGuid,
    detail.merchant?.guid,
    detail.merchant?.store_name,
    detail.product_name,
    detail.product_price,
    detail.purchase_type?.id,
    detail.purchase_type?.name,
    detail.purchase_type?.value,
    detail.qty,
    detail.total_discount,
    detail.grand_total,
  ];

  await pool.query(query, values);
}

export async function POST(request: NextRequest) {
  try {
    // Get the token from cookies (should be set from initial authentication)
    const cookies = request.cookies;
    const token = cookies.get('mwx_token')?.value;

    if (!token) {
      return NextResponse.json(
        {
          status: "error",
          message: "No MWX token found in cookies. Please authenticate first.",
        },
        { status: 401 }
      );
    }



    // Get request body
    const body = await request.json();

    // Make API call to MWX transaction service (back office endpoint)
    const url = 'https://api-mwxmarket.mwxmarket.ai/transaction-service/transaction/back-office/list';

    // Transform request body for back office API
    const backOfficeBody = {
      filter: {
        set_guid: body.filter?.set_guid || false,
        guid: body.filter?.guid || "",
        set_status: body.filter?.set_status || false,
        status: body.filter?.status || "",
        set_merchant: body.filter?.set_merchant || false,
        merchant_id: body.filter?.merchant_id || "",
        set_category: body.filter?.set_category || false,
        category: body.filter?.category || "",
        set_name: body.filter?.set_name || false,
        name: body.filter?.name || "",
        set_transaction_at: body.filter?.set_transaction_at || false,
        start_date: body.filter?.start_date || "",
        end_date: body.filter?.end_date || "",
        set_valuta: body.filter?.set_valuta || false,
        valuta: body.filter?.valuta || "",
        set_customer_id: body.filter?.set_customer_id || false,
        customer_id: body.filter?.customer_id || "",
        set_email: body.filter?.set_email || false,
        email: body.filter?.email || "",
      },
      limit: body.limit || 100,
      page: body.page || 1,
      order: body.order || "created_at",
      sort: body.sort || "DESC"
    };

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token, // MWX API expects token as header
        'cookie': `token=${token}; logged_in=1`,
        'origin': 'https://backoffice.mwxmarket.ai',
        'referer': 'https://backoffice.mwxmarket.ai/dashboard/transaction/manage-transaction',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(backOfficeBody),
    });

    // If 401 Unauthorized, try to refresh authentication and retry once
    if (response.status === 401) {
      console.log('Received 401, attempting to refresh authentication...');

      try {
        // Perform back office login to refresh authentication
        const loginResponse = await fetch('https://api-mwxmarket.mwxmarket.ai/auth-service/authentication/back-office/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token,
          },
          body: JSON.stringify({
            identifier: process.env.NEXT_PUBLIC_MWX_IDENTIFIER || 'superadmin@gmail.com',
            password: process.env.NEXT_PUBLIC_MWX_PASSWORD || 'qLlROtjr2FLwxzR8',
          }),
        });

        if (!loginResponse.ok) {
          console.error('Back office login failed during refresh');
        } else {
          const loginData = await loginResponse.json();
          if (loginData.response?.code === '00') {
            console.log('Authentication refreshed successfully, retrying API call...');

            // Retry the original API call
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': token, // MWX API expects token as header
                'cookie': `token=${token}; logged_in=1`,
                'origin': 'https://backoffice.mwxmarket.ai',
                'referer': 'https://backoffice.mwxmarket.ai/dashboard/transaction/manage-transaction',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              },
              body: JSON.stringify(backOfficeBody),
            });
          } else {
            console.error('Back office login returned error during refresh');
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh authentication:', refreshError);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MWX API Error response:', errorText);
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check if MWX API returned success
    if (data.response?.code !== "00" || data.response?.status !== "success") {
      return NextResponse.json({
        status: "api_error",
        error: data.response?.message_en || "API returned error response",
        full_response: data
      }, { status: 502 });
    }

    const transactions = data.response?.data || [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No transactions found",
        data: data.response
      });
    }

    // Save transactions to database
    console.log(`Saving ${transactions.length} transactions to database...`);
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const transaction of transactions) {
      try {
        await upsertTransaction(transaction);
        results.push({ guid: transaction.guid, status: "success" });
        successCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error saving transaction ${transaction.guid}:`, message);
        results.push({ guid: transaction.guid, status: "error", error: message });
        errorCount++;
      }
    }

    console.log(`Database save completed: ${successCount} success, ${errorCount} errors`);

    // Return response with both API data and database save results
    return NextResponse.json({
      status: "success",
      message: `Fetched ${transactions.length} transactions, saved ${successCount} to database`,
      api_data: data.response,
      database_results: {
        total_processed: transactions.length,
        success_count: successCount,
        error_count: errorCount,
        results
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch and save transactions",
      },
      { status: 500 }
    );
  }
}
