import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { executeQuery } from "@/lib/database";

export async function GET() {
  await ensureCrmSchema();
  const rows = await executeQuery("SELECT * FROM helpdesk_auto_reply_templates ORDER BY priority ASC, id ASC");
  return NextResponse.json({ rules: rows });
}

export async function POST(request: NextRequest) {
  await ensureCrmSchema();
  const body = await request.json();
  const inserted = await executeQuery(
    `INSERT INTO helpdesk_auto_reply_templates
      (name, trigger_type, trigger_config_json, reply_type, reply_payload_json, is_active, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      body?.name || "New Rule",
      body?.trigger_type || "keyword",
      JSON.stringify(body?.trigger_config_json || {}),
      body?.reply_type || "text",
      JSON.stringify(body?.reply_payload_json || {}),
      body?.is_active !== false,
      Number(body?.priority || 100),
    ]
  );
  return NextResponse.json({ rule: inserted[0] });
}

export async function PATCH(request: NextRequest) {
  await ensureCrmSchema();
  const body = await request.json();
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await executeQuery(
    `UPDATE helpdesk_auto_reply_templates
     SET name=COALESCE($2,name),
         trigger_config_json=COALESCE($3,trigger_config_json),
         reply_payload_json=COALESCE($4,reply_payload_json),
         is_active=COALESCE($5,is_active),
         priority=COALESCE($6,priority),
         updated_at=NOW()
     WHERE id=$1`,
    [
      id,
      body?.name ?? null,
      body?.trigger_config_json ? JSON.stringify(body.trigger_config_json) : null,
      body?.reply_payload_json ? JSON.stringify(body.reply_payload_json) : null,
      typeof body?.is_active === "boolean" ? body.is_active : null,
      Number.isFinite(body?.priority) ? Number(body.priority) : null,
    ]
  );
  return NextResponse.json({ ok: true });
}
