import { NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'helpdesk%'
    `);

    const tableNames = tablesResult.rows.map(r => r.table_name);

    // Check if there's any data
    const convCount = await pool.query(`SELECT COUNT(*) as count FROM helpdesk_conversations_v2`);

    return NextResponse.json({
      tables: tableNames,
      conversationCount: convCount.rows[0]?.count || 0,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      tables: [],
      conversationCount: 0
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Create a test conversation
    const result = await pool.query(`
      INSERT INTO helpdesk_conversations_v2 (provider, phone_number, status, last_message_at, lead_score, lead_category)
      VALUES ('watzap', '+6281234567890', 'open', NOW(), 50, 'warm')
      RETURNING id
    `);

    const convId = result.rows[0].id;

    // Add test messages
    await pool.query(`
      INSERT INTO helpdesk_messages_v2 (conversation_id, direction, sender_type, message_type, text_body)
      VALUES 
        ($1, 'inbound', 'customer', 'text', 'Halo, saya mau tanya produk'),
        ($1, 'outbound', 'ai', 'text', 'Halo! Terima kasih menghubungi kami. Ada yang bisa saya bantu?')
    `, [convId]);

    return NextResponse.json({ 
      success: true, 
      conversationId: convId,
      message: "Test conversation created" 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}