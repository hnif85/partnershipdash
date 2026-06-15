import { NextResponse } from "next/server";
import { upsertCustomer } from "@/lib/cmsCustomers";
import { pool } from "@/lib/database";

const API_URL =
  process.env.CMS_CUSTOMER_API_URL ??
  "https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list";
const API_KEY =
  process.env.CMS_CUSTOMER_SYNC_API_KEY ?? process.env.CMS_CUSTOMER_API_KEY;

const DEFAULT_LIMIT = Number(process.env.SYNC_CUSTOMERS_LIMIT ?? 100);
const MAX_LIMIT = 3000;

const REQUEST_TIMEOUT_MS = Number(process.env.SYNC_CUSTOMERS_TIMEOUT_MS ?? 30000);
const MAX_RETRY = Number(process.env.SYNC_CUSTOMERS_MAX_RETRY ?? 3);

type ApiCustomer = {
  guid?: string;
  username?: string;
  full_name?: string;
  gender?: string | null;
  birth_date?: string | null;
  identity_number?: string | null;
  identity_img?: string | null;
  country_id?: number | null;
  country?: string | null;
  city_id?: number | null;
  city?: string | null;
  is_identity_verified?: boolean;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_owner_name?: string | null;
  phone_number?: string | null;
  is_phone_number_verified?: boolean;
  email?: string;
  is_email_verified?: boolean;
  corporate_name?: string | null;
  industry_name?: string | null;
  employee_qty?: number | string | null;
  solution_corporate_needs?: string | string[] | null;
  referal_code?: string | null;
  is_free_trial_use?: boolean;
  status?: string | null;
  created_at?: string;
  created_by?: { guid?: string | null; name?: string | null } | null;
  updated_at?: string | null;
  updated_by?: { guid?: string | null; name?: string | null } | null;
  subscribe_list?: unknown;
  created_by_guid?: string | null;
  created_by_name?: string | null;
  updated_by_guid?: string | null;
  updated_by_name?: string | null;
};

type ApiResponse = {
  code?: string;
  status?: string;
  data?: ApiCustomer[] | { customers?: ApiCustomer[]; total_data?: number; total_page?: number };
  current_page?: number;
  limit?: number;
  total_page?: number;
  total_data?: number;
  message_en?: string;
  message_id?: string;
};

function parseInteger(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeEmployeeQty(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const stringValue = String(value);
  if (stringValue === "1-10") return 5;
  if (stringValue === "11-50") return 30;
  if (stringValue === ">50") return 51;
  const parsed = parseInt(stringValue, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCustomer(apiCustomer: ApiCustomer) {
  const solutionNeeds = Array.isArray(apiCustomer.solution_corporate_needs)
    ? apiCustomer.solution_corporate_needs.join(", ")
    : apiCustomer.solution_corporate_needs || undefined;

  return {
    guid: apiCustomer.guid || "",
    username: apiCustomer.username || undefined,
    full_name: apiCustomer.full_name || undefined,
    gender: apiCustomer.gender || undefined,
    birth_date: apiCustomer.birth_date || undefined,
    identity_number: apiCustomer.identity_number || undefined,
    identity_img: apiCustomer.identity_img || undefined,
    country_id: parseInteger(apiCustomer.country_id),
    country: apiCustomer.country || undefined,
    city_id: parseInteger(apiCustomer.city_id),
    city: apiCustomer.city || undefined,
    is_identity_verified: apiCustomer.is_identity_verified ?? false,
    bank_name: apiCustomer.bank_name || undefined,
    bank_account_number: apiCustomer.bank_account_number || undefined,
    bank_owner_name: apiCustomer.bank_owner_name || undefined,
    phone_number: apiCustomer.phone_number || undefined,
    is_phone_number_verified: apiCustomer.is_phone_number_verified ?? false,
    email: apiCustomer.email || undefined,
    is_email_verified: apiCustomer.is_email_verified ?? false,
    corporate_name: apiCustomer.corporate_name || undefined,
    industry_name: apiCustomer.industry_name || undefined,
    employee_qty: normalizeEmployeeQty(apiCustomer.employee_qty),
    solution_corporate_needs: solutionNeeds,
    referal_code: apiCustomer.referal_code || undefined,
    is_free_trial_use: apiCustomer.is_free_trial_use ?? false,
    status: apiCustomer.status || undefined,
    created_at: apiCustomer.created_at || undefined,
    created_by_guid: apiCustomer.created_by?.guid ?? apiCustomer.created_by_guid ?? undefined,
    created_by_name: apiCustomer.created_by?.name ?? apiCustomer.created_by_name ?? undefined,
    updated_at: apiCustomer.updated_at || undefined,
    updated_by_guid: apiCustomer.updated_by?.guid ?? apiCustomer.updated_by_guid ?? undefined,
    updated_by_name: apiCustomer.updated_by?.name ?? apiCustomer.updated_by_name ?? undefined,
    subscribe_list: apiCustomer.subscribe_list ?? null,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCustomersPage(offset: number, limit: number) {
  if (!API_KEY) {
    throw new Error("CMS_CUSTOMER_API_KEY is not configured");
  }

  const url = `${API_URL}?limit=${limit}&offset=${offset}`;

  let attempt = 0;
  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": API_KEY,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 504 && attempt < MAX_RETRY) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${text}`);
      }

      const json = (await response.json()) as ApiResponse;

      if (json.code !== "00") {
        throw new Error(`API error: ${json.message_en || "Unknown"}`);
      }

      const customers = (json.data?.customers || []) as ApiCustomer[];
      const totalData = json.data?.total_data ?? 0;

      return { customers, totalData, limit };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError" && attempt < MAX_RETRY) {
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as any;

    const limitInput = Number(body?.limit) || DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(limitInput, MAX_LIMIT));

    const results: Array<{ guid?: string; status: "success" | "error"; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;
    let totalProcessed = 0;
    let offset = 0;
    let totalData = 0;
    const processedGuids = new Set<string>();

    while (true) {
      const { customers, totalData: pageTotalData } = await fetchCustomersPage(offset, limit);
      totalData = pageTotalData;

      if (!customers.length) break;

      for (const apiCustomer of customers) {
        const guid = apiCustomer?.guid;

        if (!guid) {
          errorCount++;
          results.push({ guid: undefined, status: "error", error: "Missing guid" });
          continue;
        }

        if (processedGuids.has(guid)) {
          results.push({ guid, status: "error", error: "Duplicate guid, skipped" });
          continue;
        }

        processedGuids.add(guid);
        totalProcessed++;

        try {
          const dbCustomer = normalizeCustomer(apiCustomer);
          await upsertCustomer(dbCustomer);
          successCount++;
          results.push({ guid, status: "success" });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errorCount++;
          results.push({ guid, status: "error", error: message });
        }
      }

      offset += customers.length;

      if (customers.length < limit || totalProcessed >= totalData) {
        break;
      }
    }

    return NextResponse.json({
      status: "success",
      total_processed: totalProcessed,
      success_count: successCount,
      error_count: errorCount,
      total_data: totalData,
      message: "Customer sync v2 completed",
      sample_errors: results.filter((r) => r.status === "error").slice(0, 10),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-customers v2] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
