import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { conversation_id, enabled } = await request.json();

    if (!conversation_id || enabled === undefined) {
      return NextResponse.json({ error: "conversation_id and enabled required" }, { status: 400 });
    }

    await pool.query(
      `UPDATE helpdesk_conversations_v2 
       SET bot_enabled = $2, bot_paused_until = NULL, updated_at = NOW() 
       WHERE id = $1`,
      [conversation_id, enabled]
    );

    return NextResponse.json({ success: true, bot_enabled: enabled });
  } catch (error) {
    console.error("Failed to toggle bot:", error);
    return NextResponse.json({ error: "Failed to toggle bot" }, { status: 500 });
  }
}