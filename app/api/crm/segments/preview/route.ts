import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { resolveSegmentRecipients } from "@/lib/crmSegments";

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema();
    const body = await request.json();
    const recipients = await resolveSegmentRecipients(body?.filters || {});
    return NextResponse.json({ total: recipients.length, sample: recipients.slice(0, 30) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed preview" }, { status: 500 });
  }
}
