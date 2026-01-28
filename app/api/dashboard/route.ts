import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    // Overall credit statistics
    const creditStatsQuery = `
      SELECT
        COUNT(DISTINCT user_id) as users_with_transactions,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
        AVG(CASE WHEN type = 'credit' THEN amount ELSE NULL END) as avg_credit,
        AVG(CASE WHEN type = 'debit' THEN amount ELSE NULL END) as avg_debit,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND type = 'credit' THEN 1 END) as credits_today,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND type = 'debit' THEN 1 END) as debits_today,
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE AND type = 'credit' THEN amount ELSE 0 END) as credits_amount_today
      FROM credit_manager_transactions
    `;

    // Customer statistics
    const customerStatsQuery = `
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_last_30_days,
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
        COUNT(CASE WHEN (is_active = 't' OR is_active = 'true' OR is_active IS NOT NULL) OR
                     (subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0) OR
                     EXISTS (SELECT 1 FROM credit_manager_transactions cmt WHERE cmt.user_id = c.guid::uuid LIMIT 1)
                     THEN 1 END) as active_customers,
        COUNT(CASE WHEN subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0 THEN 1 END) as users_with_subscriptions,
        COUNT(CASE WHEN subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0
                   AND EXISTS (
                     SELECT 1 FROM jsonb_array_elements(subscribe_list) AS sub,
                                  jsonb_array_elements(sub->'product_list') AS prod
                     WHERE (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP
                   ) THEN 1 END) as expired_users
      FROM cms_customers c
    `;

    // Daily activity for last 7 days
    const dailyActivityQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(CASE WHEN type = 'credit' THEN 1 END) as credit_transactions,
        COUNT(CASE WHEN type = 'debit' THEN 1 END) as debit_transactions,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as daily_credits,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as daily_debits
      FROM credit_manager_transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    `;

    // Top referral partners
    const referralPartnersQuery = `
      SELECT
        referal_code,
        COUNT(*) as count
      FROM cms_customers
      WHERE referal_code IS NOT NULL AND referal_code != ''
      GROUP BY referal_code
      ORDER BY count DESC
      LIMIT 5
    `;

    const [creditStats, customerStats, dailyActivity, referralPartners] = await Promise.all([
      pool.query(creditStatsQuery),
      pool.query(customerStatsQuery),
      pool.query(dailyActivityQuery),
      pool.query(referralPartnersQuery)
    ]);

    const dashboardData = {
      creditStats: creditStats.rows[0],
      customerStats: customerStats.rows[0],
      dailyActivity: dailyActivity.rows,
      referralPartners: referralPartners.rows,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
