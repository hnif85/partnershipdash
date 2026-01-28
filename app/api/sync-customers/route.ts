import { NextResponse } from "next/server";
import { Pool } from "pg";
import { mwxAuth } from "@/lib/mwxAuth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

type CustomerFromAPI = {
  guid?: string;
  username?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  city?: string;
  country?: string;
  status?: string;
  is_active?: string;
  is_email_verified?: boolean;
  is_phone_number_verified?: boolean;
  referal_code?: string;
  created_at?: string;
  updated_at?: string;
  gender?: string;
  birth_date?: string;
  identity_number?: string;
  identity_img?: string;
  country_id?: number;
  city_id?: number;
  is_identity_verified?: boolean;
  bank_name?: string;
  bank_account_number?: string;
  bank_owner_name?: string;
  corporate_name?: string;
  industry_name?: string;
  employee_qty?: number;
  solution_corporate_needs?: string;
  is_free_trial_use?: boolean;
  created_by_guid?: string;
  created_by_name?: string;
  updated_by_guid?: string;
  updated_by_name?: string;
  subscribe_list?: Record<string, unknown>;
};

async function syncCustomersFromAPI(): Promise<CustomerFromAPI[]> {
  const baseUrl = "https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list";
  const apiKey = process.env.CMS_CUSTOMER_API_KEY;

  if (!apiKey) {
    throw new Error("CMS_CUSTOMER_API_KEY not configured. Please set CMS_CUSTOMER_API_KEY in environment variables");
  }

  console.log("Using CMS API with x-api-key authentication");

  // First, get total count from first page
  const firstPageUrl = `${baseUrl}?limit=1&page=1`;
  const headers = {
    "accept": "application/json",
    "x-api-key": apiKey,
  };

  console.log("Getting total data count...");

  const firstResponse = await fetch(firstPageUrl, {
    method: "GET",
    headers,
  });

  if (!firstResponse.ok) {
    const errorText = await firstResponse.text();
    console.error("API request failed:", firstResponse.status, errorText);
    throw new Error(`API request failed: ${firstResponse.status} ${firstResponse.statusText}`);
  }

  const firstData = await firstResponse.json();
  const totalData = firstData.data?.total_data || 0;

  if (totalData === 0) {
    console.log("No data found");
    return [];
  }

  console.log(`Total customers to sync: ${totalData}`);

  // Now fetch all data at once with limit = total_data
  const allDataUrl = `${baseUrl}?limit=${totalData}&page=1`;

  console.log(`Fetching all ${totalData} customers at once...`);

  const response = await fetch(allDataUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API request failed:", response.status, errorText);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // API returns data in structure: { data: { customers: [...] } }
  const customers = data.data?.customers || [];

  console.log(`Successfully fetched ${customers.length} customers`);
  return customers;
}

async function upsertCustomer(customer: any): Promise<void> {
  // Skip customers without guid as it's used as the primary identifier
  if (!customer.guid || customer.guid.trim() === '') {
    throw new Error('Customer guid is required for upsert operation');
  }

  // Map API response fields to database fields
  const createdByGuid = customer.created_by?.guid || null;
  const createdByName = customer.created_by?.name || null;
  const updatedByGuid = customer.updated_by?.guid || null;
  const updatedByName = customer.updated_by?.name || null;

  // Convert solution_corporate_needs array to string if it's an array
  let solutionNeeds = customer.solution_corporate_needs;
  if (Array.isArray(solutionNeeds)) {
    solutionNeeds = solutionNeeds.join(', ');
  }

  // Convert employee_qty string ranges to integer values
  let employeeQty: number | null = null;
  if (customer.employee_qty) {
    const qtyStr = customer.employee_qty.toString();
    if (qtyStr === "1-10") {
      employeeQty = 5; // average
    } else if (qtyStr === "11-50") {
      employeeQty = 30; // average
    } else if (qtyStr === ">50") {
      employeeQty = 51; // minimum value
    } else {
      // Try to parse as integer, fallback to null if fails
      const parsed = parseInt(qtyStr);
      employeeQty = isNaN(parsed) ? null : parsed;
    }
  }

  // Note: Assuming guid is unique in cms_customers table.
  // If guid is not unique, this ON CONFLICT will fail and should be changed to a different strategy.
  const query = `
    INSERT INTO cms_customers (
      guid, username, full_name, email, phone_number, city, country, status, is_active,
      is_email_verified, is_phone_number_verified, referal_code, created_at, updated_at,
      gender, birth_date, identity_number, identity_img, country_id, city_id,
      is_identity_verified, bank_name, bank_account_number, bank_owner_name,
      corporate_name, industry_name, employee_qty, solution_corporate_needs,
      is_free_trial_use, created_by_guid, created_by_name, updated_by_guid,
      updated_by_name, subscribe_list
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
    )
    ON CONFLICT (guid)
    DO UPDATE SET
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone_number = EXCLUDED.phone_number,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      status = EXCLUDED.status,
      is_active = EXCLUDED.is_active,
      is_email_verified = EXCLUDED.is_email_verified,
      is_phone_number_verified = EXCLUDED.is_phone_number_verified,
      referal_code = EXCLUDED.referal_code,
      updated_at = EXCLUDED.updated_at,
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      identity_number = EXCLUDED.identity_number,
      identity_img = EXCLUDED.identity_img,
      country_id = EXCLUDED.country_id,
      city_id = EXCLUDED.city_id,
      is_identity_verified = EXCLUDED.is_identity_verified,
      bank_name = EXCLUDED.bank_name,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_owner_name = EXCLUDED.bank_owner_name,
      corporate_name = EXCLUDED.corporate_name,
      industry_name = EXCLUDED.industry_name,
      employee_qty = EXCLUDED.employee_qty,
      solution_corporate_needs = EXCLUDED.solution_corporate_needs,
      is_free_trial_use = EXCLUDED.is_free_trial_use,
      updated_by_guid = EXCLUDED.updated_by_guid,
      updated_by_name = EXCLUDED.updated_by_name,
      subscribe_list = EXCLUDED.subscribe_list
  `;

  const values = [
    customer.guid,
    customer.username,
    customer.full_name,
    customer.email,
    customer.phone_number,
    customer.city,
    customer.country,
    customer.status,
    customer.is_active,
    customer.is_email_verified,
    customer.is_phone_number_verified,
    customer.referal_code,
    customer.created_at ? new Date(customer.created_at) : null,
    customer.updated_at ? new Date(customer.updated_at) : null,
    customer.gender,
    customer.birth_date ? new Date(customer.birth_date) : null,
    customer.identity_number,
    customer.identity_img,
    customer.country_id,
    customer.city_id,
    customer.is_identity_verified,
    customer.bank_name,
    customer.bank_account_number,
    customer.bank_owner_name,
    customer.corporate_name,
    customer.industry_name,
    employeeQty,
    solutionNeeds,
    customer.is_free_trial_use,
    createdByGuid,
    createdByName,
    updatedByGuid,
    updatedByName,
    customer.subscribe_list ? JSON.stringify(customer.subscribe_list) : null,
  ];

  await pool.query(query, values);
}

export async function GET() {
  try {
    console.log("Testing MWX CMS API connection...");

    const baseUrl = "https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list";
    const apiKey = process.env.CMS_CUSTOMER_API_KEY;

    if (!apiKey) {
      throw new Error("CMS_CUSTOMER_API_KEY not configured. Please set CMS_CUSTOMER_API_KEY in environment variables");
    }

    // Test fetch first page only
    const url = `${baseUrl}?limit=10&page=1`;
    const headers = {
      "accept": "application/json",
      "x-api-key": apiKey,
    };

    console.log("Making request to MWX CMS API...");
    console.log("URL:", url);
    console.log("Headers:", { ...headers, "x-api-key": "[REDACTED]" });

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    console.log("MWX API Response status:", response.status);
    console.log("MWX API Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MWX API Error response:", errorText);
      return NextResponse.json({
        error: `MWX CMS API request failed: ${response.status} ${response.statusText}`,
        details: errorText,
        status: "error"
      }, { status: 502 });
    }

    const data = await response.json();
    console.log("MWX API Full Response:", JSON.stringify(data, null, 2));

    // Check if API returned an error
    if (data.error || data.success === false) {
      console.error("MWX API returned error:", data.error || data.message || "Unknown error");
      return NextResponse.json({
        status: "api_error",
        error: data.error || data.message || "API returned error response",
        full_response: data
      }, { status: 502 });
    }

    // API returns data in structure: { data: { customers: [...] } }
    const customers = data.data?.customers || [];
    const customerCount = Array.isArray(customers) ? customers.length : 0;

    console.log(`Successfully fetched ${customerCount} customers from MWX CMS API`);
    console.log("Response data structure:", {
      hasData: !!data.data,
      hasDataCustomers: !!data.data?.customers,
      isArray: Array.isArray(data),
      dataKeys: Object.keys(data),
      totalData: data.data?.total_data || 'unknown'
    });

    return NextResponse.json({
      status: "api_test_success",
      message: "MWX CMS API connection successful",
      customer_count: customerCount,
      sample_customer: customers[0] || null,
      full_response_structure: {
        hasData: !!data.data,
        hasCustomers: !!data.customers,
        isArray: Array.isArray(data),
        dataKeys: Object.keys(data)
      }
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
    console.log("Starting customer sync process...");

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not configured");
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    console.log("Fetching customers from MWX API...");
    // Fetch customers from external API
    const customers = await syncCustomersFromAPI();
    console.log(`Fetched ${customers.length} customers from MWX API`);

    if (customers.length === 0) {
      console.warn("No customers fetched from MWX API");
      return NextResponse.json({
        status: "sync_completed",
        total_processed: 0,
        message: "No customers to sync",
        results: []
      });
    }

    // Check database connection
    console.log("Testing database connection...");
    await pool.query('SELECT 1');
    console.log("Database connection OK");

    // Upsert each customer into the database
    console.log("Starting upsert process...");
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    const totalCustomers = customers.length;
    const progressInterval = Math.max(1, Math.floor(totalCustomers / 10)); // Show progress every 10%

    for (let i = 0; i < totalCustomers; i++) {
      const customer = customers[i];
      try {
        // Show progress every 10% or at start/end
        if (i === 0 || i === totalCustomers - 1 || (i + 1) % progressInterval === 0) {
          const percentage = Math.round(((i + 1) / totalCustomers) * 100);
          console.log(`Processing customers: ${i + 1}/${totalCustomers} (${percentage}%)`);
        }

        await upsertCustomer(customer);
        results.push({ guid: customer.guid, status: "success" });
        successCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error upserting customer ${customer.guid}:`, message);
        results.push({ guid: customer.guid, status: "error", error: message });
        errorCount++;
      }
    }

    console.log(`Sync completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      status: "sync_completed",
      total_processed: customers.length,
      success_count: successCount,
      error_count: errorCount,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
