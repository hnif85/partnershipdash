import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("start_date") || "";
    const endDate = searchParams.get("end_date") || "";
    const customerGuid = searchParams.get("customer_guid") || "";
    const paymentChannel = searchParams.get("payment_channel") || "";
    const currency = searchParams.get("currency") || "IDR";
    const referral = searchParams.get("referral") || "";

    const whereConditions: string[] = ["dee.email IS NULL"];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        t.invoice_number ILIKE $${paramIndex} OR
        c.full_name ILIKE $${paramIndex + 1} OR
        c.email ILIKE $${paramIndex + 2} OR
        c.username ILIKE $${paramIndex + 3}
      )`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 4;
    }

    if (status) {
      whereConditions.push(`LOWER(t.status) = LOWER($${paramIndex})`);
      params.push(status);
      paramIndex += 1;
    }

    if (startDate) {
      whereConditions.push(`t.created_at >= $${paramIndex}::timestamp`);
      params.push(startDate);
      paramIndex += 1;
    }

    if (endDate) {
      whereConditions.push(`t.created_at <= $${paramIndex}::timestamp`);
      params.push(endDate);
      paramIndex += 1;
    }

    if (customerGuid) {
      whereConditions.push(`t.customer_guid = $${paramIndex}`);
      params.push(customerGuid);
      paramIndex += 1;
    }

    if (paymentChannel) {
      whereConditions.push(`t.payment_channel_name = $${paramIndex}`);
      params.push(paymentChannel);
      paramIndex += 1;
    }

    if (currency) {
      whereConditions.push(`UPPER(t.valuta_code) = UPPER($${paramIndex})`);
      params.push(currency);
      paramIndex += 1;
    }

    if (referral) {
      whereConditions.push(`rp.partner ILIKE $${paramIndex}`);
      params.push(`%${referral}%`);
      paramIndex += 1;
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const query = `
      SELECT
        COUNT(t.*) as total_transactions,
        COUNT(CASE WHEN LOWER(t.status) = 'finished' THEN 1 END) as finished_transactions,
        COUNT(CASE WHEN LOWER(t.status) = 'failed' THEN 1 END) as failed_transactions,
        COALESCE(SUM(CASE WHEN LOWER(t.status) = 'finished' THEN t.grand_total ELSE 0 END), 0) as total_revenue
      FROM transactions t
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      LEFT JOIN referral_partners rp ON c.referal_code = rp.code
      ${whereClause}
    `;

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    return NextResponse.json({
      total_transactions: parseInt(stats.total_transactions),
      finished_transactions: parseInt(stats.finished_transactions),
      failed_transactions: parseInt(stats.failed_transactions),
      total_revenue: parseFloat(stats.total_revenue)
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
