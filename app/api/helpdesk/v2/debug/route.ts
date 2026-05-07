import { NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS helpdesk_webhook_debug (
        id SERIAL PRIMARY KEY,
        payload_json JSONB,
        received_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      `SELECT * FROM helpdesk_webhook_debug ORDER BY received_at DESC LIMIT 20`
    );

    return NextResponse.json({ 
      debugEntries: result.rows,
      count: result.rows.length 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}