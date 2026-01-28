import { NextResponse } from "next/server";
import { upsertCustomer } from "../../../../lib/cmsCustomers";
import fs from "fs";
import path from "path";

const API_URL = "https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list";
const API_KEY = "8wHKXjrO/LtJ92zCyXHelt8gzlXKIfUDAn40/AkCf2cer7rreV4lOKdJXij42XVcCn6P4/ekaWHDkTHWEPUpHGwe";
const LIMIT = 3000;

interface ApiCustomer {
  guid: string;
  username: string;
  full_name: string;
  gender: string | null;
  birth_date: string | null;
  identity_number: string | null;
  identity_img: string | null;
  country_id: number | null;
  country: string | null;
  city_id: number | null;
  city: string | null;
  is_identity_verified: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_owner_name: string | null;
  phone_number: string | null;
  is_phone_number_verified: boolean;
  email: string;
  is_email_verified: boolean;
  corporate_name: string;
  industry_name: string;
  employee_qty: number | null;
  solution_corporate_needs: string | null;
  referal_code: string;
  is_free_trial_use: boolean;
  status: string;
  created_at: string;
  created_by: {
    guid: string;
    name: string;
  };
  updated_at: string | null;
  updated_by: {
    guid: string;
    name: string;
  } | null;
  subscribe_list: unknown;
}

interface ApiResponse {
  code: string;
  status: string;
  data: {
    customers: ApiCustomer[];
    limit: number;
    total_data: number;
  };
  message_en: string;
  message_id: string;
}

async function fetchCustomers(offset: number): Promise<ApiResponse> {
  const url = `${API_URL}?limit=${LIMIT}&offset=${offset}`;
  const response = await fetch(url, {
    headers: {
      "x-api-key": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parseInteger(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? undefined : parsed;
}

function mapApiCustomerToDb(apiCustomer: ApiCustomer) {
  return {
    guid: apiCustomer.guid,
    username: apiCustomer.username,
    full_name: apiCustomer.full_name,
    gender: apiCustomer.gender || undefined,
    birth_date: apiCustomer.birth_date || undefined,
    identity_number: apiCustomer.identity_number || undefined,
    identity_img: apiCustomer.identity_img || undefined,
    country_id: parseInteger(apiCustomer.country_id),
    country: apiCustomer.country || undefined,
    city_id: parseInteger(apiCustomer.city_id),
    city: apiCustomer.city || undefined,
    is_identity_verified: apiCustomer.is_identity_verified,
    bank_name: apiCustomer.bank_name || undefined,
    bank_account_number: apiCustomer.bank_account_number || undefined,
    bank_owner_name: apiCustomer.bank_owner_name || undefined,
    phone_number: apiCustomer.phone_number || undefined,
    is_phone_number_verified: apiCustomer.is_phone_number_verified,
    email: apiCustomer.email,
    is_email_verified: apiCustomer.is_email_verified,
    corporate_name: apiCustomer.corporate_name,
    industry_name: apiCustomer.industry_name,
    employee_qty: parseInteger(apiCustomer.employee_qty),
    solution_corporate_needs: apiCustomer.solution_corporate_needs || undefined,
    referal_code: apiCustomer.referal_code,
    is_free_trial_use: apiCustomer.is_free_trial_use,
    status: apiCustomer.status,
    created_at: apiCustomer.created_at,
    created_by_guid: apiCustomer.created_by.guid,
    created_by_name: apiCustomer.created_by.name,
    updated_at: apiCustomer.updated_at || undefined,
    updated_by_guid: apiCustomer.updated_by?.guid || undefined,
    updated_by_name: apiCustomer.updated_by?.name || undefined,
    subscribe_list: apiCustomer.subscribe_list,
  };
}

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function customerToCsvRow(apiCustomer: ApiCustomer): string {
  const row = [
    escapeCsvValue(apiCustomer.guid),
    escapeCsvValue(apiCustomer.username),
    escapeCsvValue(apiCustomer.full_name),
    escapeCsvValue(apiCustomer.email),
    escapeCsvValue(apiCustomer.phone_number),
    escapeCsvValue(apiCustomer.city),
    escapeCsvValue(apiCustomer.country),
    escapeCsvValue(apiCustomer.status),
    escapeCsvValue(''), // is_active (not available in API)
    escapeCsvValue(apiCustomer.is_email_verified),
    escapeCsvValue(apiCustomer.is_phone_number_verified),
    escapeCsvValue(apiCustomer.referal_code),
    escapeCsvValue(apiCustomer.created_at),
    escapeCsvValue(apiCustomer.updated_at),
    escapeCsvValue(apiCustomer.gender),
    escapeCsvValue(apiCustomer.birth_date),
    escapeCsvValue(apiCustomer.identity_number),
    escapeCsvValue(apiCustomer.country_id),
    escapeCsvValue(apiCustomer.city_id),
    escapeCsvValue(apiCustomer.is_identity_verified),
    escapeCsvValue(apiCustomer.bank_name),
    escapeCsvValue(apiCustomer.bank_account_number),
    escapeCsvValue(apiCustomer.bank_owner_name),
    escapeCsvValue(apiCustomer.corporate_name),
    escapeCsvValue(apiCustomer.industry_name),
    escapeCsvValue(apiCustomer.employee_qty),
    escapeCsvValue(apiCustomer.solution_corporate_needs),
    escapeCsvValue(apiCustomer.is_free_trial_use),
    escapeCsvValue(apiCustomer.created_by?.guid),
    escapeCsvValue(apiCustomer.created_by?.name),
    escapeCsvValue(apiCustomer.updated_by?.guid),
    escapeCsvValue(apiCustomer.updated_by?.name),
    escapeCsvValue(JSON.stringify(apiCustomer.subscribe_list))
  ];
  return row.join(',') + '\n';
}

export async function POST() {
  try {
    let offset = 0;
    let totalSynced = 0;
    let totalData = 0;
    let batchCount = 0;
    const processedGuids = new Set<string>(); // Track processed GUIDs to avoid duplicates

    // Prepare CSV file
    const csvFilePath = path.join(process.cwd(), 'customers_sync.csv');
    const csvHeaders = [
      'guid', 'username', 'full_name', 'email', 'phone_number', 'city', 'country',
      'status', 'is_active', 'is_email_verified', 'is_phone_number_verified',
      'referal_code', 'created_at', 'updated_at', 'gender', 'birth_date',
      'identity_number', 'country_id', 'city_id', 'is_identity_verified',
      'bank_name', 'bank_account_number', 'bank_owner_name', 'corporate_name',
      'industry_name', 'employee_qty', 'solution_corporate_needs', 'is_free_trial_use',
      'created_by_guid', 'created_by_name', 'updated_by_guid', 'updated_by_name',
      'subscribe_list'
    ];

    // Write CSV headers only if file doesn't exist
    if (!fs.existsSync(csvFilePath)) {
      fs.writeFileSync(csvFilePath, csvHeaders.join(',') + '\n');
      console.log(`CSV file created with headers: ${csvFilePath}`);
    } else {
      console.log(`CSV file exists, appending to: ${csvFilePath}`);
    }
    console.log("Starting customer sync v2...");

    while (true) {
      batchCount++;
      console.log(`=== BATCH ${batchCount} ===`);
      console.log(`Fetching customers with offset ${offset}...`);

      const apiResponse = await fetchCustomers(offset);

      if (apiResponse.code !== "00" || apiResponse.status !== "success") {
        throw new Error(`API returned error: ${apiResponse.message_en}`);
      }

      const { customers, total_data } = apiResponse.data;
      totalData = total_data;

      console.log(`API Response: ${customers.length} customers received, total_data: ${total_data}`);

      if (customers.length === 0) {
        console.log(`No more customers to fetch at offset ${offset}`);
        break;
      }

      console.log(`Processing ${customers.length} customers (offset: ${offset}, total_data: ${total_data})`);

      let batchSuccess = 0;
      let batchErrors = 0;
      const errors: string[] = [];

      // Collect CSV rows for this batch
      const csvRows: string[] = [];

      for (let i = 0; i < customers.length; i++) {
        const apiCustomer = customers[i];

        // Check for duplicate GUIDs within current batch or previously processed
        if (processedGuids.has(apiCustomer.guid)) {
          console.log(`Skipping duplicate customer ${apiCustomer.guid} in batch ${batchCount}`);
          continue;
        }

        try {
          const dbCustomer = mapApiCustomerToDb(apiCustomer);
          await upsertCustomer(dbCustomer);

          // Mark as processed and add to CSV
          processedGuids.add(apiCustomer.guid);
          csvRows.push(customerToCsvRow(apiCustomer));

          batchSuccess++;
          totalSynced++;
        } catch (error) {
          batchErrors++;
          const errorMsg = `Failed to sync customer ${apiCustomer.guid}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[${batchCount}-${i + 1}] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`Batch ${batchCount} processed ${customers.length} customers, ${customers.length - (batchSuccess + batchErrors)} duplicates skipped`);

      // Write successful records to CSV file
      if (csvRows.length > 0) {
        fs.appendFileSync(csvFilePath, csvRows.join(''));
        console.log(`Wrote ${csvRows.length} records to CSV for batch ${batchCount}`);
      }

      console.log(`Batch ${batchCount} complete: ${batchSuccess} success, ${batchErrors} errors. Total synced so far: ${totalSynced}`);

      if (errors.length > 0 && errors.length <= 5) {
        console.log(`Sample errors from batch ${batchCount}:`, errors.slice(0, 3));
      }

      offset += LIMIT;

      // Break if we've processed all data or if we got fewer customers than limit
      if (offset >= totalData || customers.length < LIMIT) {
        console.log(`Sync complete: offset ${offset} >= totalData ${totalData} or got ${customers.length} < ${LIMIT} customers`);
        break;
      }

      // Safety break to prevent infinite loop
      if (batchCount > 100) {
        console.log("Safety break: too many batches, stopping sync");
        break;
      }
    }

    console.log(`=== SYNC COMPLETED ===`);
    console.log(`Total batches processed: ${batchCount}`);
    console.log(`Total customers synced: ${totalSynced}`);
    console.log(`Total data from API: ${totalData}`);

    return NextResponse.json({
      status: "success",
      total_synced: totalSynced,
      total_data: totalData,
      batches_processed: batchCount,
      message: "Customer sync completed successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
