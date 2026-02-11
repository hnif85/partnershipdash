import { NextResponse } from "next/server";

const SYNC_URL = "https://n8n.mediawave.co.id/webhook/sync_user";

export async function POST() {
  try {
    // Trigger the webhook without waiting for the full sync (webhook can take a long time)
    fetch(SYNC_URL, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.text().catch(() => "");
        if (!res.ok) {
          console.error(`[sync-user] Upstream error ${res.status}: ${body}`);
        } else {
          console.log("[sync-user] Upstream accepted:", body?.slice(0, 200) || "(empty)");
        }
      })
      .catch((err) => console.error("[sync-user] Request failed:", err));

    // Return immediately so the client doesn't hit a timeout
    return NextResponse.json({ status: "triggered" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
