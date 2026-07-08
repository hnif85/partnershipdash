import { NextRequest, NextResponse } from "next/server";
import { getDeliverablesByGuid } from "@/lib/createwhiz";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ guid: string }> },
) {
  const { guid: rawGuid } = await params;

  if (!rawGuid) {
    return NextResponse.json({ error: "Missing deliverable guid" }, { status: 400 });
  }

  if (!process.env.CREATEWHIZ_SUPER_TOKEN) {
    console.error("[createwhiz] Missing CREATEWHIZ_SUPER_TOKEN env");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const result = await getDeliverablesByGuid(rawGuid);
  return NextResponse.json(result);
}
