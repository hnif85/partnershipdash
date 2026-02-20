import { NextResponse } from "next/server";
import { upsertCustomer } from "../../../../lib/cmsCustomers";

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

export async function POST() {
  try {
    let offset = 0;
    let totalSynced = 0;
    let totalData = 0;
    let batchCount = 0;
    const processedGuids = new Set<string>(); // Track processed GUIDs to avoid duplicates
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
