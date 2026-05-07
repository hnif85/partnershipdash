import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { executeQuery } from "@/lib/database";
import { sendDamcorpText } from "@/lib/damcorpWhatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await ensureCrmSchema();
  const rows = await executeQuery(
    "SELECT * FROM helpdesk_conversations ORDER BY COALESCE(last_message_at, created_at) DESC LIMIT 200"
  );
  return NextResponse.json(
    { conversations: rows },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
  );
}

export async function PATCH(request: NextRequest) {
  await ensureCrmSchema();
  const body = await request.json();
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await executeQuery(
    `UPDATE helpdesk_conversations
     SET status=COALESCE($2,status), assigned_to=COALESCE($3,assigned_to),
         bot_enabled=COALESCE($4,bot_enabled), updated_at=NOW()
     WHERE id=$1`,
    [id, body?.status || null, body?.assigned_to || null, typeof body?.bot_enabled === "boolean" ? body.bot_enabled : null]
  );
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  await ensureCrmSchema();
  const body = await request.json();
  const conversationId = Number(body?.conversation_id);
  const text = String(body?.text || "").trim();
  if (!conversationId || !text) return NextResponse.json({ error: "conversation_id and text required" }, { status: 400 });

  const conv = await executeQuery<any>("SELECT * FROM helpdesk_conversations WHERE id=$1", [conversationId]);
  if (conv.length === 0) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const phone = conv[0].phone_number;
  const result = await sendDamcorpText(phone, text);

  await executeQuery(
    `INSERT INTO helpdesk_messages (conversation_id, direction, sender_type, message_type, text_body, wa_message_id, delivery_status, payload_json)
     VALUES ($1,'outbound','agent','text',$2,$3,'sent',$4)`,
    [conversationId, text, result.waMessageId || null, JSON.stringify(result.raw || {})]
  );

  await executeQuery(
    "UPDATE helpdesk_conversations SET bot_enabled=false, status='pending', last_message_at=NOW(), updated_at=NOW() WHERE id=$1",
    [conversationId]
  );

  return NextResponse.json({ ok: true, wa_message_id: result.waMessageId || null });
}
