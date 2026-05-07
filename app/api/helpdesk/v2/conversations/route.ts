import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { ensureCrmSchema } from "@/lib/crmSchema";

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");

    let whereClause = "";
    if (filter === "unread") {
      whereClause = "WHERE unread_count > 0";
    }

    const convResult = await pool.query<any>(
      `SELECT id, phone_number, customer_name, provider, status, lead_score, lead_category, 
              last_intent, unread_count, last_message_at, bot_enabled, created_at
       FROM helpdesk_conversations_v2 
       ${whereClause}
       ORDER BY last_message_at DESC
       LIMIT 500`
    );

    const statsResult = await pool.query<any>(
      `SELECT lead_category, COUNT(*) as count 
       FROM helpdesk_conversations_v2 
       GROUP BY lead_category`
    );

    const unreadStats = await pool.query<any>(
      `SELECT COUNT(*) as count FROM helpdesk_conversations_v2 WHERE unread_count > 0`
    );

    const stats = { 
      hot: 0, 
      warm: 0, 
      medium: 0, 
      cold: 0, 
      total: convResult.rows.length,
      unread: parseInt(unreadStats.rows[0]?.count || 0)
    };
    statsResult.rows.forEach((row: any) => {
      if (row.lead_category in stats) {
        stats[row.lead_category as keyof typeof stats] = parseInt(row.count);
      }
    });

    return NextResponse.json({
      conversations: convResult.rows,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureCrmSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();
    const { status } = body;

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    await pool.query(
      `UPDATE helpdesk_conversations_v2 SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update conversation:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}