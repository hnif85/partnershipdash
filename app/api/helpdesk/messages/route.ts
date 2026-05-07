import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { executeQuery } from "@/lib/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  await ensureCrmSchema();
  const id = Number(request.nextUrl.searchParams.get("conversation_id") || "0");
  if (!id) return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  const rows = await executeQuery("SELECT * FROM helpdesk_messages WHERE conversation_id=$1 ORDER BY id ASC", [id]);
  return NextResponse.json(
    { messages: rows },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
  );
}
