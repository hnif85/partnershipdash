import { NextRequest, NextResponse } from "next/server";

type SyncResult = {
  name: "customers" | "transactions" | "usage";
  ok: boolean;
  status: number | null;
  body?: any;
  error?: string;
};

function resolveBaseUrl(req: NextRequest): string {
  const envBase =
    process.env.INTERNAL_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL;

  if (envBase) {
    // Support bare host in Vercel URL
    if (!envBase.startsWith("http")) {
      return `https://${envBase}`;
    }
    return envBase.replace(/\/$/, "");
  }

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function hitEndpoint(
  name: SyncResult["name"],
  url: string,
  init?: RequestInit
): Promise<SyncResult> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const text = await res.text();
    let parsed: any = undefined;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch (err) {
      parsed = { raw: text, parse_error: err instanceof Error ? err.message : String(err) };
    }

    return { name, ok: res.ok, status: res.status, body: parsed, error: res.ok ? undefined : text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { name, ok: false, status: null, error: message };
  }
}

function formatYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const baseUrl = resolveBaseUrl(req);

  const results: SyncResult[] = [];

  // Sync customers: last 20 days window to ensure FK completeness for transactions
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);

  results.push(
    await hitEndpoint("customers", `${baseUrl}/api/sync-customers/v2`, {
      method: "POST",
      body: JSON.stringify({
        filter: {
          set_date: true,
          start_date: formatYMD(startDate),
          end_date: formatYMD(endDate),
        },
      }),
    })
  );

  // Sync transactions
  results.push(
    await hitEndpoint("transactions", `${baseUrl}/api/sync-transactions`, {
      method: "POST",
      body: JSON.stringify({}),
    })
  );

  // Sync usage (credit manager transactions)
  results.push(
    await hitEndpoint("usage", `${baseUrl}/api/sync-credit-manager-transactions`, {
      method: "POST",
      body: JSON.stringify({}),
    })
  );

  const hasError = results.some((r) => !r.ok);

  return NextResponse.json(
    {
      status: hasError ? "partial_error" : "success",
      results,
      triggered_at: new Date().toISOString(),
    },
    { status: hasError ? 207 : 200 }
  );
}

export async function GET(req: NextRequest) {
  // Health check to verify base URL resolution works for cron
  const baseUrl = resolveBaseUrl(req);
  return NextResponse.json({ status: "ready", base_url: baseUrl });
}
