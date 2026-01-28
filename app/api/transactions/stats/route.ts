import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT
        COUNT(t.*) as total_transactions,
        COUNT(CASE WHEN LOWER(t.status) = 'finished' THEN 1 END) as finished_transactions,
        COUNT(CASE WHEN LOWER(t.status) = 'failed' THEN 1 END) as failed_transactions,
        COALESCE(SUM(CASE WHEN LOWER(t.status) = 'finished' AND UPPER(t.valuta_code) = 'IDR' THEN t.grand_total ELSE 0 END), 0) as total_revenue_idr
      FROM transactions t
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      WHERE dee.email IS NULL
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return NextResponse.json({
      total_transactions: parseInt(stats.total_transactions),
      finished_transactions: parseInt(stats.finished_transactions),
      failed_transactions: parseInt(stats.failed_transactions),
      total_revenue: parseFloat(stats.total_revenue_idr)
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stats API error:", error);
    return NextResponse.json({
      error: message,
      total_transactions: 0,
      finished_transactions: 0,
      failed_transactions: 0,
      total_revenue: 0
    }, { status: 500 });
  }
}
