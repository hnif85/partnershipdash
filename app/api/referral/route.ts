import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort_by') || 'user_count'; // Default sort by user_count
    const sortOrder = searchParams.get('sort_order') || 'desc'; // Default desc

    // Validate sort parameters
    const validSortFields = ['user_count', 'finished_transactions_count', 'total_purchase_amount', 'partner_name', 'referral_code'];
    const validSortOrders = ['asc', 'desc'];

    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'user_count';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    // Build the main query to get referral statistics
    const query = `
      WITH referral_stats AS (
        SELECT
          COALESCE(c.referal_code, 'No Referral Code') as referral_code,
          rp.partner as partner_name,
          COUNT(DISTINCT c.guid)::int as user_count,
          CASE
            WHEN COALESCE(c.referal_code, '') != '' THEN 'Customer Referral'
            ELSE 'No Code'
          END as referral_type
        FROM cms_customers c
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        LEFT JOIN referral_partners rp ON c.referal_code = rp.code
        WHERE dee.email IS NULL
        GROUP BY c.referal_code, rp.partner
      ),
      purchase_stats AS (
        SELECT
          COALESCE(c.referal_code, 'No Referral Code') as referral_code,
          SUM(CASE WHEN LOWER(t.status) = 'finished' AND UPPER(t.valuta_code) = 'IDR' THEN t.grand_total ELSE 0 END)::numeric as total_purchase_amount,
          COUNT(CASE WHEN LOWER(t.status) = 'finished' AND UPPER(t.valuta_code) = 'IDR' THEN 1 END)::int as finished_transactions_count
        FROM cms_customers c
        LEFT JOIN transactions t ON c.guid = t.customer_guid
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        WHERE dee.email IS NULL
        GROUP BY c.referal_code
      ),
      credit_stats AS (
        SELECT
          COALESCE(c.referal_code, 'No Referral Code') as referral_code,
          SUM(CASE WHEN cmt.type = 'debit' THEN cmt.amount ELSE 0 END)::numeric as total_credit_used,
          SUM(CASE WHEN cmt.type = 'credit' THEN cmt.amount ELSE 0 END)::numeric as total_credit_added
        FROM cms_customers c
        LEFT JOIN credit_manager_transactions cmt ON c.guid::uuid = cmt.user_id
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        WHERE dee.email IS NULL
        GROUP BY c.referal_code
      )
      SELECT
        rs.referral_code,
        CASE WHEN rs.partner_name = 'None' THEN NULL ELSE rs.partner_name END as partner_name,
        rs.user_count,
        rs.referral_type,
        COALESCE(ps.total_purchase_amount, 0) as total_purchase_amount,
        COALESCE(ps.finished_transactions_count, 0) as finished_transactions_count,
        COALESCE(cs.total_credit_used, 0) as total_credit_used,
        COALESCE(cs.total_credit_added, 0) as total_credit_added,
        -- Calculate net credit (added - used)
        (COALESCE(cs.total_credit_added, 0) - COALESCE(cs.total_credit_used, 0))::numeric as net_credit
      FROM referral_stats rs
      LEFT JOIN purchase_stats ps ON rs.referral_code = ps.referral_code
      LEFT JOIN credit_stats cs ON rs.referral_code = cs.referral_code
      WHERE rs.user_count > 0
      ORDER BY ${finalSortBy === 'partner_name' ? "CASE WHEN partner_name IS NULL THEN 1 ELSE 0 END, partner_name" : finalSortBy} ${finalSortOrder}
    `;

    const result = await pool.query(query);

    const referrals = result.rows.map(row => ({
      referral_code: row.referral_code,
      partner_name: row.partner_name,
      user_count: row.user_count,
      referral_type: row.referral_type,
      total_purchase_amount: parseFloat(row.total_purchase_amount) || 0,
      finished_transactions_count: row.finished_transactions_count,
      total_credit_used: parseFloat(row.total_credit_used) || 0,
      total_credit_added: parseFloat(row.total_credit_added) || 0,
      net_credit: parseFloat(row.net_credit) || 0
    }));

    return NextResponse.json({
      referrals,
      total_count: referrals.length
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral API error:", error);
    return NextResponse.json({
      error: message,
      referrals: [],
      total_count: 0
    }, { status: 500 });
  }
}