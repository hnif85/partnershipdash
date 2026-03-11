import { NextResponse } from "next/server";
import { upsertCustomer } from "@/lib/cmsCustomers";

const API_URL =
  process.env.CMS_CUSTOMER_PUBLIC_API_URL ??
  "https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list/public";
const API_KEY =
  process.env.CMS_CUSTOMER_PUBLIC_API_KEY ?? process.env.CMS_CUSTOMER_API_KEY;

const DEFAULT_LIMIT = Number(process.env.SYNC_CUSTOMERS_LIMIT ?? 300);
const MAX_LIMIT = 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.SYNC_CUSTOMERS_TIMEOUT_MS ?? 20000);
const MAX_RETRY = Number(process.env.SYNC_CUSTOMERS_MAX_RETRY ?? 3);
const DEFAULT_THROTTLE_MS = Number(process.env.SYNC_CUSTOMERS_DAILY_THROTTLE_MS ?? 300);
const MAX_RANGE_DAYS = Number(process.env.SYNC_CUSTOMERS_MAX_RANGE_DAYS ?? 370);

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

type DaySyncResult = {
  date: string;
  processed: number;
  success: number;
  errors: number;
  sample_errors: Array<{ guid?: string; error: string }>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  console.log("[daily-range] requesting upstream", {
    page,
    limit,
    filter: payload.filter,
    order: payload.order,
    sort: payload.sort,
  });

  let attempt = 0;
  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
      const customers =
        Array.isArray(json.data) ? json.data : json.data?.customers ? json.data.customers : [];

      const totalData =
        json.total_data ??
        (typeof json.data === "object" && !Array.isArray(json.data)
          ? json.data?.total_data
          : undefined);

      const totalPage =
        json.total_page ??
        (typeof json.data === "object" && !Array.isArray(json.data)
          ? json.data?.total_page
          : undefined);

      console.log("[daily-range] upstream result", {
        page,
        customers: customers.length,
        totalData,
        totalPage,
      });

      return { customers, totalData: totalData ?? customers.length, totalPage: totalPage ?? null };
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

async function syncSingleDay(
  date: string,
  limit: number,
  baseFilter: any,
  order?: string,
  sort?: string
): Promise<DaySyncResult> {
  let page = 1;
  let processed = 0;
  let success = 0;
  let errors = 0;
  const sampleErrors: Array<{ guid?: string; error: string }> = [];
  const processedGuids = new Set<string>();
  // Beberapa endpoint membutuhkan rentang (start<= date < end); gunakan end_date = start_date + 1 hari.
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  const endDateStr = formatYMD(endDate);

  while (true) {
    const { customers, totalData, totalPage } = await fetchCustomersPage(page, limit, {
      filter: {
        ...baseFilter,
        set_date: true,
        start_date: date,
        end_date: endDateStr,
      },
      order,
      sort,
    });

    if (!customers.length) break;

    for (const apiCustomer of customers) {
      const guid = apiCustomer?.guid;
      if (!guid) {
        errors += 1;
        if (sampleErrors.length < 5) sampleErrors.push({ guid: undefined, error: "Missing guid" });
        continue;
      }

      if (processedGuids.has(guid)) {
        errors += 1;
        if (sampleErrors.length < 5)
          sampleErrors.push({ guid, error: "Duplicate guid in payload, skipped" });
        continue;
      }

      processedGuids.add(guid);
      processed += 1;

      try {
        const dbCustomer = normalizeCustomer(apiCustomer);
        await upsertCustomer(dbCustomer);
        success += 1;
      } catch (err) {
        errors += 1;
        const message = err instanceof Error ? err.message : "Unknown error";
        if (sampleErrors.length < 5) sampleErrors.push({ guid, error: message });
      }
    }

    page += 1;

    if ((totalPage && page > totalPage) || customers.length < limit || processed >= (totalData || 0)) {
      break;
    }
  }

  return { date, processed, success, errors, sample_errors: sampleErrors };
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as any;

    const now = new Date();
    const startDateStr = typeof body?.start_date === "string" ? body.start_date : `${now.getFullYear()}-01-01`;
    const endDateStr = typeof body?.end_date === "string" ? body.end_date : formatYMD(now);

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid start_date or end_date" }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: "start_date must be before or equal to end_date" }, { status: 400 });
    }

    const rangeDays = Math.floor(
      (endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Date range too large: ${rangeDays} days. Max allowed is ${MAX_RANGE_DAYS}` },
        { status: 400 }
      );
    }

    const limitInput = Number(body?.limit) || DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(limitInput, MAX_LIMIT));
    const throttleMs = Math.max(0, Number(body?.throttle_ms ?? DEFAULT_THROTTLE_MS));
    const baseFilter = body?.filter || {};
    const order = body?.order;
    const sort = body?.sort;

    const dayResults: DaySyncResult[] = [];
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = formatYMD(cursor);
      const result = await syncSingleDay(dateStr, limit, baseFilter, order, sort);
      dayResults.push(result);
      console.log("[daily-range] day summary", {
        date: dateStr,
        processed: result.processed,
        success: result.success,
        errors: result.errors,
      });
      totalProcessed += result.processed;
      totalSuccess += result.success;
      totalErrors += result.errors;

      if (throttleMs > 0) {
        await sleep(throttleMs);
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    const successDays = dayResults.filter((d) => d.errors === 0).length;

    return NextResponse.json({
      status: "success",
      start_date: formatYMD(startDate),
      end_date: formatYMD(endDate),
      days_processed: dayResults.length,
      total_processed: totalProcessed,
      total_success: totalSuccess,
      total_errors: totalErrors,
      total_success_days: successDays,
      sample_errors: dayResults.flatMap((d) =>
        d.sample_errors.map((e) => ({ ...e, date: d.date }))
      ).slice(0, 10),
      per_day: dayResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-customers/daily-range] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
