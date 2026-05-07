import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { executeQuery } from "@/lib/database";

export async function GET(request: NextRequest) {
  await ensureCrmSchema();
  const flow = (request.nextUrl.searchParams.get("flow") || "new_user").trim();
  const rows = await executeQuery(
    "SELECT id, flow_type, template_name, template_text FROM crm_templates WHERE flow_type=$1 ORDER BY id DESC",
    [flow]
  );
  return NextResponse.json({ templates: rows });
}

export async function POST(request: NextRequest) {
  await ensureCrmSchema();
  const body = await request.json();
  const flowType = String(body?.flow_type || "").trim();
  const templateName = String(body?.template_name || "").trim();
  const templateText = String(body?.template_text || "").trim();
  if (!flowType || !templateName || !templateText) {
    return NextResponse.json({ error: "flow_type, template_name, template_text required" }, { status: 400 });
  }

  const rows = await executeQuery(
    `INSERT INTO crm_templates (flow_type, template_name, template_text)
     VALUES ($1,$2,$3)
     ON CONFLICT (flow_type, template_name)
     DO UPDATE SET template_text=EXCLUDED.template_text, updated_at=NOW()
     RETURNING id, flow_type, template_name, template_text`,
    [flowType, templateName, templateText]
  );

  return NextResponse.json({ template: rows[0] });
}
