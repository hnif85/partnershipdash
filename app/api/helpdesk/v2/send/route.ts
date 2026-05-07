import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { sendWatZapText } from "@/lib/watZap";
import { sendDamcorpText } from "@/lib/damcorpWhatsapp";

export async function POST(request: NextRequest) {
  try {
    const { conversation_id, message, sender_type = "agent" } = await request.json();

    if (!conversation_id || !message) {
      return NextResponse.json({ error: "conversation_id and message required" }, { status: 400 });
    }

    const convResult = await pool.query<any>(
      "SELECT phone_number, provider FROM helpdesk_conversations_v2 WHERE id = $1",
      [conversation_id]
    );

    if (convResult.rows.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { phone_number, provider } = convResult.rows[0];

    let waMessageId = null;
    let sendError = null;

    try {
      if (provider === "damcorp") {
        const result = await sendDamcorpText(phone_number, message);
        waMessageId = result.waMessageId || null;
      } else {
        const result = await sendWatZapText(phone_number, message);
        waMessageId = result.raw?.wamid || null;
      }
    } catch (error) {
      sendError = error instanceof Error ? error.message : "Failed to send";
      console.error(`${provider} send error:`, error);
    }

    const msgResult = await pool.query<any>(
      `INSERT INTO helpdesk_messages_v2 
        (conversation_id, direction, sender_type, message_type, text_body, wa_message_id, delivery_status)
       VALUES ($1, 'outbound', $2, 'text', $3, $4, $5)
       RETURNING id`,
      [conversation_id, sender_type, message, waMessageId, sendError ? "failed" : "sent"]
    );

    await pool.query(
      `UPDATE helpdesk_conversations_v2 
       SET status = 'pending', last_message_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [conversation_id]
    );

    return NextResponse.json({
      success: !sendError,
      message_id: msgResult.rows[0].id,
      wa_message_id: waMessageId,
      error: sendError,
    });
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}