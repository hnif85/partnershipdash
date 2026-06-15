import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership", "crm");

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
    return authErrorResponse(error);
  }
}