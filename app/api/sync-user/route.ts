import { NextResponse } from "next/server";

const SYNC_URL = "https://n8n.mediawave.co.id/webhook/sync_user";

export async function POST() {
  try {
    const res = await fetch(SYNC_URL, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { status?: string };
    if (data.status !== "success") {
      return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
    return NextResponse.json({ status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
