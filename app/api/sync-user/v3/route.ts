import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { upsertCustomer } from "@/lib/cmsCustomers";

const API_URL =
  process.env.CMS_CUSTOMER_PUBLIC_API_URL ?? process.env.CMS_CUSTOMER_API_URL;
const API_KEY =
  process.env.CMS_CUSTOMER_PUBLIC_API_KEY ?? process.env.CMS_CUSTOMER_API_KEY;
const LIMIT = Number(process.env.SYNC_USER_V3_LIMIT ?? 300);

type ApiCustomer = {
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
};

type ApiResponse = {
  code?: string;
  status?: string;
  data?:
    | ApiCustomer[]
    | {
        customers?: ApiCustomer[];
        total_data?: number;
        total_page?: number;
      };
  current_page?: number;
  limit?: number;
  total_page?: number;
  total_data?: number;
  message_en?: string;
  message_id?: string;
};

function formatYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchCustomersPage(
  page: number,
  limit: number,
  startDate: string,
  endDate: string
): Promise<{ customers: ApiCustomer[]; totalData: number; totalPage: number | null }> {
  if (!API_KEY) {
    throw new Error("CMS_CUSTOMER_PUBLIC_API_KEY / CMS_CUSTOMER_API_KEY is not configured");
  }
  if (!API_URL) {
    throw new Error("CMS_CUSTOMER_PUBLIC_API_URL / CMS_CUSTOMER_API_URL is not configured");
  }

  const payload = {
    filter: {
      set_date: true,
      start_date: startDate,
      end_date: endDate,
    },
    limit,
    page,
    order: "created_at",
    sort: "DESC",
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const json = (await response.json()) as ApiResponse;
  const customers = Array.isArray(json.data)
    ? json.data
    : json.data?.customers
      ? json.data.customers
      : [];

  const totalData =
    json.total_data ??
    (typeof json.data === "object" && !Array.isArray(json.data) ? json.data?.total_data : undefined);

  const totalPage =
    json.total_page ??
    (typeof json.data === "object" && !Array.isArray(json.data) ? json.data?.total_page : undefined);

  return { customers, totalData: totalData ?? customers.length, totalPage: totalPage ?? null };
}

function parseInteger(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    // Ambil tanggal created_at terakhir dari database
    const latest = await pool
      .query<{ max_created_at: string | null }>(`SELECT MAX(created_at) AS max_created_at FROM cms_customers`)
      .then((r) => r.rows[0]?.max_created_at);

    const lastCreated = latest ? new Date(latest) : new Date();
    const startDate = formatYMD(new Date(lastCreated.getTime() - 24 * 60 * 60 * 1000)); // H-1
    const endDate = formatYMD(new Date()); // Hari ini

    let page = 1;
    let totalSynced = 0;
    let totalData = 0;
    let batchCount = 0;
    const processedGuids = new Set<string>();

    console.log(`[sync-user v3] Start date ${startDate}, end date ${endDate}`);

    while (true) {
      batchCount += 1;
      const { customers, totalData: apiTotalData, totalPage } = await fetchCustomersPage(
        page,
        LIMIT,
        startDate,
        endDate
      );
      if (apiTotalData) {
        totalData = apiTotalData;
      }

      if (!customers.length) break;

      let batchSuccess = 0;
      for (const apiCustomer of customers) {
        if (processedGuids.has(apiCustomer.guid)) {
          continue;
        }

        try {
          const dbCustomer = mapApiCustomerToDb(apiCustomer);
          await upsertCustomer(dbCustomer);
          processedGuids.add(apiCustomer.guid);
          batchSuccess += 1;
          totalSynced += 1;
        } catch (error) {
          console.error(`[sync-user v3] Failed to sync customer ${apiCustomer.guid}:`, error);
        }
      }

      page += 1;

      if ((totalPage && page > totalPage) || customers.length < LIMIT || (totalData && totalSynced >= totalData)) {
        break;
      }

      if (batchCount > 100) {
        console.log("[sync-user v3] Safety break: too many batches");
        break;
      }
    }

    return NextResponse.json({
      status: "success",
      start_date: startDate,
      end_date: endDate,
      total_synced: totalSynced,
      total_data: totalData,
      batches_processed: batchCount,
      message: "Customer incremental sync (H-1) completed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-user v3] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
