import { NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";

export async function GET() {
  await ensureCrmSchema();
  return NextResponse.json({ ok: true, module: "crm" });
}
