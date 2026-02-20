import { NextResponse } from "next/server";
import { upsertCustomer } from "@/lib/cmsCustomers";
import { pool } from "@/lib/database";

const API_URL =
  process.env.CMS_CUSTOMER_PUBLIC_API_URL ??
  "https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list/public";
const API_KEY =
  process.env.CMS_CUSTOMER_PUBLIC_API_KEY ?? process.env.CMS_CUSTOMER_API_KEY;

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 3000;

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

async function fetchCustomersPage(page: number, limit: number, bodyFilter: any) {
  if (!API_KEY) {
    throw new Error("CMS_CUSTOMER_PUBLIC_API_KEY / CMS_CUSTOMER_API_KEY is not configured");
  }

  const payload = {
    filter: {
      set_guid: false,
      set_name: false,
      set_email: false,
      set_date: false,
      set_platform: false,
      ...(bodyFilter?.filter || bodyFilter || {}),
    },
    limit,
    page,
    order: bodyFilter?.order || "created_at",
    sort: bodyFilter?.sort || "DESC",
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
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const json = (await response.json()) as ApiResponse;

  const customers =
    Array.isArray(json.data) ? json.data : json.data?.customers ? json.data.customers : [];

  const totalData =
    json.total_data ??
    (typeof json.data === "object" && !Array.isArray(json.data) ? json.data?.total_data : undefined);

  const totalPage =
    json.total_page ??
    (typeof json.data === "object" && !Array.isArray(json.data) ? json.data?.total_page : undefined);

  return { customers, totalData: totalData ?? customers.length, totalPage: totalPage ?? null };
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as any;
    const useIncremental = body?.incremental === true || body?.mode === "incremental";

    const limitInput = Number(body?.limit) || DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(limitInput, MAX_LIMIT));
    let page = Number(body?.page) || 1;
    let filter = body?.filter || {};

    // Incremental mode: derive date range from last created_at in cms_customers
    if (useIncremental) {
      const latest = await pool
        .query<{ max_created_at: string | null }>(
          `SELECT MAX(created_at) AS max_created_at FROM cms_customers`
        )
        .then((r) => r.rows[0]?.max_created_at);

      const lastCreated = latest ? new Date(latest) : new Date();
      // Start: H-1 from last created, set to 00:00 local
      const start = new Date(lastCreated);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 1);
      // End: today, 23:59 local (API expects YYYY-MM-DD; use date string)
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const formatYMDLocal = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      filter = {
        ...filter,
        set_date: true,
        start_date: formatYMDLocal(start),
        end_date: formatYMDLocal(end),
      };
    }

    const results: Array<{ guid?: string; status: "success" | "error"; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;
    let totalProcessed = 0;
    let totalPage = 0;
    const processedGuids = new Set<string>();

    // Iterate through paginated API until no more data
    // The external API returns current_page/total_page so we stop when finished or when batch < limit.
    while (true) {
      const { customers, totalData, totalPage: apiTotalPage } = await fetchCustomersPage(page, limit, {
        filter,
        order: body?.order,
        sort: body?.sort,
      });

      if (apiTotalPage) {
        totalPage = apiTotalPage;
      }

      if (!customers.length) break;

      for (const apiCustomer of customers) {
        const guid = apiCustomer?.guid;

        if (!guid) {
          errorCount++;
          results.push({ guid: undefined, status: "error", error: "Missing guid" });
          continue;
        }

        if (processedGuids.has(guid)) {
          // Skip duplicate customer within the same sync run
          results.push({ guid, status: "error", error: "Duplicate guid in payload, skipped" });
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
      page += 1;

      // Stop when we reached last page
      if ((apiTotalPage && page > apiTotalPage) || customers.length < limit || totalProcessed >= (totalData || 0)) {
        break;
      }
    }

    return NextResponse.json({
      status: "success",
      total_processed: totalProcessed,
      success_count: successCount,
      error_count: errorCount,
      total_pages: totalPage || undefined,
      message: "Customer sync v2 completed",
      sample_errors: results.filter((r) => r.status === "error").slice(0, 5),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-customers v2] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
