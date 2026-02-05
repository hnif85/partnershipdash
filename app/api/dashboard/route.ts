import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(_request: NextRequest) {
  try {
    // 1) Jumlah user yang membeli (transaksi IDR dengan status finished)
    const usersPurchasedQuery = `
      SELECT COUNT(DISTINCT t.customer_guid) AS users_purchased
      FROM transactions t
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      WHERE UPPER(t.valuta_code) = 'IDR'
        AND LOWER(t.status) = 'finished'
        AND (dee.email IS NULL)
    `;

    // 2) Statistik referral per kode
    const referralStatsQuery = `
      WITH customers AS (
        SELECT guid, referal_code, subscribe_list, email
        FROM cms_customers
        WHERE referal_code IS NOT NULL AND referal_code <> ''
      ),
      filtered_customers AS (
        SELECT c.*
        FROM customers c
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        WHERE dee.email IS NULL
      ),
      transactions_idr AS (
        SELECT DISTINCT customer_guid
        FROM transactions
        WHERE UPPER(valuta_code) = 'IDR' AND LOWER(status) = 'finished'
      ),
      expired_apps AS (
        SELECT DISTINCT fc.guid
        FROM filtered_customers fc,
             LATERAL jsonb_array_elements(COALESCE(fc.subscribe_list, '[]'::jsonb)) sub,
             LATERAL jsonb_array_elements(COALESCE(sub->'product_list', '[]'::jsonb)) prod
        WHERE prod->>'expired_at' IS NOT NULL
          AND (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP
      ),
      active_apps AS (
        SELECT DISTINCT fc.guid
        FROM filtered_customers fc
        WHERE fc.subscribe_list IS NOT NULL
          AND jsonb_array_length(fc.subscribe_list) > 0
        EXCEPT
        SELECT guid FROM expired_apps
      )
      SELECT
        fc.referal_code,
        rp.partner AS partner_name,
        COUNT(*)                            AS registered_users,
        COUNT(DISTINCT CASE WHEN ti.customer_guid IS NOT NULL THEN fc.guid END) AS buying_users,
        COUNT(DISTINCT CASE WHEN ea.guid IS NOT NULL THEN fc.guid END)          AS expired_app_users,
        COUNT(DISTINCT CASE WHEN aa.guid IS NOT NULL THEN fc.guid END)          AS all_active_app_users
      FROM filtered_customers fc
      LEFT JOIN referral_partners rp ON rp.code = fc.referal_code
      LEFT JOIN transactions_idr ti ON ti.customer_guid = fc.guid
      LEFT JOIN expired_apps ea ON ea.guid = fc.guid
      LEFT JOIN active_apps aa ON aa.guid = fc.guid
      GROUP BY fc.referal_code, rp.partner
      ORDER BY registered_users DESC, fc.referal_code;
    `;

    // 3) Pertumbuhan pembelian per hari (14 hari terakhir)
    const dailyPurchasesQuery = `
      WITH date_range AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day')::date AS date
      ),
      purchases AS (
        SELECT
          DATE(t.created_at) AS date,
          COUNT(*) AS transactions,
          COUNT(DISTINCT t.customer_guid) AS unique_buyers,
          COALESCE(SUM(t.grand_total), 0) AS total_idr
        FROM transactions t
        LEFT JOIN cms_customers c ON t.customer_guid = c.guid
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        WHERE UPPER(t.valuta_code) = 'IDR'
          AND LOWER(t.status) = 'finished'
          AND dee.email IS NULL
        GROUP BY DATE(t.created_at)
      )
      SELECT
        d.date,
        COALESCE(p.transactions, 0) AS transactions,
        COALESCE(p.unique_buyers, 0) AS unique_buyers,
        COALESCE(p.total_idr, 0) AS total_idr
      FROM date_range d
      LEFT JOIN purchases p ON d.date = p.date
      ORDER BY d.date;
    `;

    // 4) Penggunaan aplikasi per hari (14 hari terakhir, debit = penggunaan kredit)
    const dailyUsageQuery = `
      WITH date_range AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day')::date AS date
      ),
      usages AS (
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS usage_events,
          COUNT(DISTINCT user_id) AS unique_users,
          COALESCE(SUM(amount), 0) AS total_amount
        FROM credit_manager_transactions
        WHERE LOWER(type) = 'debit'
        GROUP BY DATE(created_at)
      )
      SELECT
        d.date,
        COALESCE(u.usage_events, 0) AS usage_events,
        COALESCE(u.unique_users, 0) AS unique_users,
        COALESCE(u.total_amount, 0) AS total_amount
      FROM date_range d
      LEFT JOIN usages u ON d.date = u.date
      ORDER BY d.date;
    `;

    // 5) Jumlah user dengan aplikasi akan expired < 7 hari lagi
    const expiringSoonQuery = `
      WITH customers AS (
        SELECT guid, email, COALESCE(subscribe_list, '[]'::jsonb) AS subscribe_list
        FROM cms_customers
      ),
      subs AS (
        SELECT
          c.guid,
          c.email,
          jsonb_array_elements(subscribe_list) AS sub
        FROM customers c
      ),
      products AS (
        SELECT
          s.guid,
          s.email,
          jsonb_array_elements(COALESCE(sub->'product_list', '[]'::jsonb)) AS prod
        FROM subs s
      ),
      expiring AS (
        SELECT DISTINCT p.guid, p.email
        FROM products p
        WHERE p.prod->>'expired_at' IS NOT NULL
          AND (p.prod->>'expired_at')::timestamp >= CURRENT_TIMESTAMP
          AND (p.prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP + INTERVAL '7 days'
      )
      SELECT COUNT(DISTINCT e.guid) AS expiring_users
      FROM expiring e
      LEFT JOIN demo_excluded_emails dee ON e.email = dee.email AND dee.is_active = true
      WHERE dee.email IS NULL;
    `;

    const [
      usersPurchasedRes,
      referralStatsRes,
      dailyPurchasesRes,
      dailyUsageRes,
      expiringSoonRes,
    ] = await Promise.all([
      pool.query(usersPurchasedQuery),
      pool.query(referralStatsQuery),
      pool.query(dailyPurchasesQuery),
      pool.query(dailyUsageQuery),
      pool.query(expiringSoonQuery),
    ]);

    const referralStats = referralStatsRes.rows.map((row) => ({
      referal_code: row.referal_code ?? row.referal_code ?? row.referral_code ?? null,
      partner_name: row.partner_name ?? null,
      registered_users: Number(row.registered_users) || 0,
      buying_users: Number(row.buying_users) || 0,
      expired_app_users: Number(row.expired_app_users) || 0,
      all_active_app_users: Number(row.all_active_app_users) || 0,
    }));

    const dashboardData = {
      usersPurchasedIdrFinished: Number(usersPurchasedRes.rows[0]?.users_purchased || 0),
      referralStats,
      dailyPurchases: dailyPurchasesRes.rows,
      dailyUsage: dailyUsageRes.rows,
      expiringSoonUsers: Number(expiringSoonRes.rows[0]?.expiring_users || 0),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
