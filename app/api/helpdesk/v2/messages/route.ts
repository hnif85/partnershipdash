import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    const result = await pool.query<any>(
      `SELECT id, direction, sender_type, text_body, intent_detected, is_read, created_at
       FROM helpdesk_messages_v2 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    // Auto-mark unread inbound messages as read
    const unreadMessages = result.rows.filter(
      (m: any) => m.direction === "inbound" && !m.is_read
    );

    if (unreadMessages.length > 0) {
      await pool.query(
        `UPDATE helpdesk_messages_v2 
         SET is_read = TRUE 
         WHERE conversation_id = $1 AND direction = 'inbound' AND is_read = FALSE`,
        [conversationId]
      );

      // Reset unread_count in conversation
      await pool.query(
        `UPDATE helpdesk_conversations_v2 
         SET unread_count = 0 
         WHERE id = $1`,
        [conversationId]
      );
    }

    return NextResponse.json({ messages: result.rows });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}