import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT DISTINCT
        payment_channel_name,
        payment_channel_code
      FROM transactions
      WHERE payment_channel_name IS NOT NULL
        AND payment_channel_name != ''
      ORDER BY payment_channel_name ASC
    `;

    const result = await pool.query(query);

    const paymentChannels = result.rows.map(row => ({
      name: row.payment_channel_name,
      code: row.payment_channel_code
    }));

    return NextResponse.json({
      payment_channels: paymentChannels
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment channels API error:", error);
    return NextResponse.json({
      error: message,
      payment_channels: []
    }, { status: 500 });
  }
}
