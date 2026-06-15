import { NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    const daysBack = 120;

    const paidPredicate = `
      LOWER(t.status) = 'finished'
      AND COALESCE(t.grand_total, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM transaction_details td
        WHERE td.transaction_guid = t.guid
          AND LOWER(td.purchase_type_name) = 'free trial'
      )
      AND LOWER(t.payment_channel_name) NOT LIKE 'free%'
    `;

    const results = await Promise.all([

      // Panel 1 — User Funnel per Channel
      pool.query(`
        WITH filtered AS (
          SELECT c.guid, c.referal_code, COALESCE(rp.activity_slug, 'other') AS channel
          FROM cms_customers c
          LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
          LEFT JOIN referral_partners rp ON c.referal_code = rp.code
          WHERE dee.email IS NULL
        ),
        trial_tx AS (
          SELECT DISTINCT t.customer_guid
          FROM transactions t
          JOIN transaction_details td ON td.transaction_guid = t.guid
          WHERE LOWER(td.purchase_type_name) = 'free trial'
        ),
        paid_tx AS (
          SELECT DISTINCT t.customer_guid
          FROM transactions t
          WHERE ${paidPredicate}
        ),
        active_usage AS (
          SELECT DISTINCT cmt.user_id
          FROM credit_manager_transactions cmt
          WHERE LOWER(cmt.type) = 'debit'
            AND cmt.created_at >= NOW() - INTERVAL '30 days'
        ),
        repeat_tx AS (
          SELECT customer_guid
          FROM transactions t
          WHERE ${paidPredicate}
          GROUP BY customer_guid
          HAVING COUNT(*) >= 2
        )
        SELECT
          f.channel,
          COUNT(DISTINCT f.guid) AS registered,
          COUNT(DISTINCT tt.customer_guid) AS trial_users,
          COUNT(DISTINCT pt.customer_guid) AS paid_users,
          COUNT(DISTINCT au.user_id) AS active_users,
          COUNT(DISTINCT rt.customer_guid) AS repeat_users
        FROM filtered f
        LEFT JOIN trial_tx tt ON tt.customer_guid::uuid = f.guid::uuid
        LEFT JOIN paid_tx pt ON pt.customer_guid::uuid = f.guid::uuid
        LEFT JOIN active_usage au ON au.user_id = f.guid::uuid
        LEFT JOIN repeat_tx rt ON rt.customer_guid::uuid = f.guid::uuid
        GROUP BY f.channel
        ORDER BY registered DESC
      `),

      // Panel 2 — Channel Performance (transactions, revenue)
      pool.query(`
        SELECT
          COALESCE(rp.activity_slug, 'other') AS channel,
          COUNT(*) AS transactions,
          COUNT(DISTINCT t.customer_guid::uuid) AS unique_buyers,
          COALESCE(SUM(t.grand_total), 0) AS revenue_idr
        FROM transactions t
        JOIN cms_customers c ON t.customer_guid::uuid = c.guid::uuid
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        LEFT JOIN referral_partners rp ON c.referal_code = rp.code
        WHERE ${paidPredicate}
          AND dee.email IS NULL
        GROUP BY COALESCE(rp.activity_slug, 'other')
        ORDER BY revenue_idr DESC
      `),

      // Panel 3 — Revenue & Purchase Trends (daily, last 120 days)
      pool.query(`
        WITH date_range AS (
          SELECT generate_series(CURRENT_DATE - ($1::int || ' days')::INTERVAL, CURRENT_DATE, '1 day')::date AS date
        ),
        daily AS (
          SELECT
            DATE(t.created_at) AS date,
            COUNT(*) AS transaction_count,
            COUNT(DISTINCT t.customer_guid::uuid) AS unique_buyers,
            COALESCE(SUM(t.grand_total), 0) AS revenue_idr
          FROM transactions t
          JOIN cms_customers c ON t.customer_guid::uuid = c.guid::uuid
          LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
          WHERE ${paidPredicate}
            AND dee.email IS NULL
          GROUP BY DATE(t.created_at)
        )
        SELECT
          d.date,
          COALESCE(dl.transaction_count, 0) AS transaction_count,
          COALESCE(dl.unique_buyers, 0) AS unique_buyers,
          COALESCE(dl.revenue_idr, 0) AS revenue_idr
        FROM date_range d
        LEFT JOIN daily dl ON d.date = dl.date
        ORDER BY d.date
      `, [daysBack]),

      // Panel 4 — Usage & Engagement Trends
      pool.query(`
        WITH date_range AS (
          SELECT generate_series(CURRENT_DATE - ($1::int || ' days')::INTERVAL, CURRENT_DATE, '1 day')::date AS date
        ),
        daily_usage AS (
          SELECT
            DATE(cmt.created_at) AS date,
            COUNT(*) AS usage_events,
            COUNT(DISTINCT cmt.user_id) AS unique_users,
            COALESCE(SUM(cmt.amount), 0) AS total_amount
          FROM credit_manager_transactions cmt
          JOIN cms_customers c ON c.guid::uuid = cmt.user_id
          LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
          WHERE LOWER(cmt.type) = 'debit'
            AND dee.email IS NULL
          GROUP BY DATE(cmt.created_at)
        )
        SELECT
          d.date,
          COALESCE(u.usage_events, 0) AS usage_events,
          COALESCE(u.unique_users, 0) AS unique_users,
          COALESCE(u.total_amount, 0) AS total_amount
        FROM date_range d
        LEFT JOIN daily_usage u ON d.date = u.date
        ORDER BY d.date
      `, [daysBack]),

      // Panel 5 — Partner Leaderboard
      pool.query(`
        SELECT
          COALESCE(rp.partner, 'N/A') AS partner_name,
          rp.code AS referal_code,
          COUNT(DISTINCT c.guid) AS registered_users,
          COUNT(DISTINCT pt.customer_guid) AS buying_users,
          COALESCE(SUM(pt.grand_total), 0) AS revenue_idr
        FROM referral_partners rp
        JOIN cms_customers c ON c.referal_code = rp.code
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        LEFT JOIN LATERAL (
          SELECT t.customer_guid, t.grand_total
          FROM transactions t
          WHERE t.customer_guid::uuid = c.guid::uuid
            AND ${paidPredicate}
        ) pt ON TRUE
        WHERE dee.email IS NULL
        GROUP BY rp.partner, rp.code
        ORDER BY revenue_idr DESC
        LIMIT 20
      `),

      // Panel 6 — Data Health
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM demo_excluded_emails WHERE is_active = true) AS excluded_email_count,
          (SELECT COUNT(DISTINCT c.guid)
           FROM cms_customers c
           LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
           WHERE dee.email IS NULL) AS clean_customer_count,
          (SELECT COUNT(*) FROM transactions) AS total_transactions_raw,
          (SELECT COUNT(*)
           FROM transactions t
           LEFT JOIN cms_customers c ON t.customer_guid::uuid = c.guid::uuid
           LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
           WHERE dee.email IS NULL) AS clean_transaction_count
      `),

    ]);

    const [
      funnelRes,
      channelPerfRes,
      revenueTrendRes,
      usageTrendRes,
      partnerLeaderboardRes,
      dataHealthRes,
    ] = results;

    return NextResponse.json({
      funnel: funnelRes.rows.map(r => ({
        channel: r.channel,
        registered: Number(r.registered),
        trialUsers: Number(r.trial_users),
        paidUsers: Number(r.paid_users),
        activeUsers: Number(r.active_users),
        repeatUsers: Number(r.repeat_users),
      })),
      channelPerformance: channelPerfRes.rows.map(r => ({
        channel: r.channel,
        transactions: Number(r.transactions),
        uniqueBuyers: Number(r.unique_buyers),
        revenueIdr: Number(r.revenue_idr),
      })),
      revenueTrend: revenueTrendRes.rows.map(r => ({
        date: r.date,
        transactionCount: Number(r.transaction_count),
        uniqueBuyers: Number(r.unique_buyers),
        revenueIdr: Number(r.revenue_idr),
      })),
      usageTrend: usageTrendRes.rows.map(r => ({
        date: r.date,
        usageEvents: Number(r.usage_events),
        uniqueUsers: Number(r.unique_users),
        totalAmount: Number(r.total_amount),
      })),
      partnerLeaderboard: partnerLeaderboardRes.rows.map(r => ({
        partnerName: r.partner_name,
        referalCode: r.referal_code,
        registeredUsers: Number(r.registered_users),
        buyingUsers: Number(r.buying_users),
        revenueIdr: Number(r.revenue_idr),
      })),
      dataHealth: {
        excludedEmailCount: Number(dataHealthRes.rows[0]?.excluded_email_count || 0),
        cleanCustomerCount: Number(dataHealthRes.rows[0]?.clean_customer_count || 0),
        totalTransactionsRaw: Number(dataHealthRes.rows[0]?.total_transactions_raw || 0),
        cleanTransactionCount: Number(dataHealthRes.rows[0]?.clean_transaction_count || 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Executive deck API error:", error);
    return NextResponse.json({ error: "Failed to fetch executive deck data" }, { status: 500 });
  }
}
