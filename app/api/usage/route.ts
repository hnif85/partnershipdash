import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

function buildWhereClauses(
  base: { startDate: string; endDate: string },
  extras: { productFilter?: string; search?: string; partnerFilter?: string },
) {
  const clauses: string[] = [
    `LOWER(cmt.type) = 'debit'`,
    `dee.email IS NULL`,
    `cmt.created_at::date >= $1::date`,
    `cmt.created_at::date <= $2::date`,
  ];
  const values: any[] = [base.startDate, base.endDate];
  let idx = 3;

  if (extras.productFilter) {
    clauses.push(`COALESCE(p.app_name, cmt.product_name) = $${idx}`);
    values.push(extras.productFilter);
    idx++;
  }

  if (extras.partnerFilter) {
    clauses.push(`rp.partner = $${idx}`);
    values.push(extras.partnerFilter);
    idx++;
  }

  if (extras.search) {
    clauses.push(`(c.full_name ILIKE $${idx} OR c.email ILIKE $${idx})`);
    values.push(`%${extras.search}%`);
    idx++;
  }

  return { whereSql: clauses.join("\n    AND "), values, nextIdx: idx };
}

const productJoin = `
LEFT JOIN (SELECT DISTINCT agent_id, app_name FROM products) p ON p.agent_id = cmt.agent::text
`;

const partnerJoin = `
LEFT JOIN referral_partners rp ON rp.code = c.referal_code
`;

const productExpr = `LOWER(COALESCE(p.app_name, cmt.product_name))`;

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date") || "2024-01-01";
    const endDate = searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const productFilter = searchParams.get("product") || undefined;
    const partnerFilter = searchParams.get("partner") || undefined;
    const search = searchParams.get("search") || undefined;
    const userBenarOnly = searchParams.get("user_benar") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const sortBy = searchParams.get("sort_by") || "last_usage_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const sortWhitelist: Record<string, string> = {
      email: "email",
      partner_name: "partner_name",
      product_name: "product_name",
      event_usage: "event_usage",
      non_event_usage: "non_event_usage",
      total_usage: "total_usage",
      debit_count: "debit_count",
      last_usage_at: "last_usage_at",
    };
    const sortCol = sortWhitelist[sortBy] || "last_usage_at";
    const sortDir = sortOrder === "asc" ? "ASC" : "DESC";

    const base = { startDate, endDate };
    const extras = { productFilter, search, partnerFilter };
    const { whereSql, values, nextIdx } = buildWhereClauses(base, extras);

    // User event dates CTE: which user attended which event dates (supports multi-day events)
    const userEventsCte = `
user_events AS (
  SELECT DISTINCT c.guid::uuid AS user_id, gs::date AS event_date
  FROM cms_customers c
  JOIN event_registrations er ON er.email = c.email
  JOIN training_events te ON te.id = er.event_id
  CROSS JOIN LATERAL generate_series(COALESCE(te.start_date, te.event_date), COALESCE(te.end_date, te.event_date), '1 day') gs
  WHERE COALESCE(te.start_date, te.event_date) IS NOT NULL
)
`;

    // User usage list with partner name + event/non-event split
    const userUsageQuery = `
      WITH ${userEventsCte},
      usage_data AS (
        SELECT
          cmt.user_id,
          c.full_name,
          c.email,
          rp.partner AS partner_name,
          ${productExpr} AS product_name,
          COUNT(*)::int AS debit_count,
          COALESCE(SUM(ABS(cmt.amount)), 0) AS total_usage,
          COALESCE(SUM(ABS(cmt.amount)) FILTER (WHERE ue.event_date IS NOT NULL), 0) AS event_usage,
          COALESCE(SUM(ABS(cmt.amount)) FILTER (WHERE ue.event_date IS NULL), 0) AS non_event_usage,
          MAX(cmt.created_at) AS last_usage_at,
          ub.id IS NOT NULL AS is_user_benar
        FROM credit_manager_transactions cmt
        JOIN cms_customers c ON c.guid::uuid = cmt.user_id
        ${partnerJoin}
        ${productJoin}
        LEFT JOIN user_events ue ON ue.user_id = cmt.user_id AND ue.event_date = cmt.created_at::date
        LEFT JOIN user_benar ub ON ub.customer_guid::uuid = c.guid::uuid AND ub.deleted_at IS NULL
        LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
        WHERE ${whereSql}${userBenarOnly ? "\n    AND ub.id IS NOT NULL" : ""}
        GROUP BY cmt.user_id, c.full_name, c.email, rp.partner, ${productExpr}, ub.id
      )
      SELECT *, COUNT(*) OVER() AS full_count
      FROM usage_data
      ORDER BY ${sortCol} ${sortDir}
      OFFSET $${nextIdx} LIMIT $${nextIdx + 1}
    `;
    const userResult = await pool.query(userUsageQuery, [...values, offset, limit]);

    // Product recap
    const productRecapQuery = `
      SELECT
        ${productExpr} AS product_name,
        COUNT(DISTINCT cmt.user_id) AS unique_users,
        COUNT(*)::int AS debit_count,
        COALESCE(SUM(ABS(cmt.amount)), 0) AS total_usage
      FROM credit_manager_transactions cmt
      JOIN cms_customers c ON c.guid::uuid = cmt.user_id
      ${partnerJoin}
      ${productJoin}
      LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
      WHERE ${whereSql}
      GROUP BY ${productExpr}
      ORDER BY total_usage DESC
    `;
    const productResult = await pool.query(productRecapQuery, values);

    // Daily trend
    const dailyTrendQuery = `
      WITH date_range AS (
        SELECT generate_series($1::date, $2::date, '1 day')::date AS date
      ),
      usages AS (
        SELECT
          DATE(cmt.created_at) AS date,
          COUNT(*)::int AS debit_events,
          COUNT(DISTINCT cmt.user_id) AS unique_users,
          COALESCE(SUM(ABS(cmt.amount)), 0) AS total_usage
        FROM credit_manager_transactions cmt
        JOIN cms_customers c ON c.guid::uuid = cmt.user_id
        ${partnerJoin}
        ${productJoin}
        LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
        WHERE ${whereSql}
        GROUP BY DATE(cmt.created_at)
      )
      SELECT d.date,
        COALESCE(u.debit_events, 0) AS debit_events,
        COALESCE(u.unique_users, 0) AS unique_users,
        COALESCE(u.total_usage, 0) AS total_usage
      FROM date_range d
      LEFT JOIN usages u ON d.date = u.date
      ORDER BY d.date
    `;
    const trendResult = await pool.query(dailyTrendQuery, values);

    // Distinct app names for filter dropdown
    const productsQuery = `
      SELECT DISTINCT ${productExpr} AS product_name
      FROM credit_manager_transactions cmt
      LEFT JOIN products p ON p.agent_id = cmt.agent::text
      WHERE LOWER(cmt.type) = 'debit'
      ORDER BY product_name
    `;
    const productsResult = await pool.query(productsQuery);

    // Distinct partner names for filter dropdown
    const partnersQuery = `
      SELECT DISTINCT rp.partner
      FROM credit_manager_transactions cmt
      JOIN cms_customers c ON c.guid::uuid = cmt.user_id
      JOIN referral_partners rp ON rp.code = c.referal_code
      WHERE LOWER(cmt.type) = 'debit' AND rp.partner IS NOT NULL
      ORDER BY rp.partner
    `;
    const partnersResult = await pool.query(partnersQuery);

    // Summary stats
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT cmt.user_id) AS total_users,
        COUNT(*)::int AS total_debits,
        COALESCE(SUM(ABS(cmt.amount)), 0) AS total_usage
      FROM credit_manager_transactions cmt
      JOIN cms_customers c ON c.guid::uuid = cmt.user_id
      ${partnerJoin}
      ${productJoin}
      LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
      WHERE ${whereSql}
    `;
    const summaryResult = await pool.query(summaryQuery, values);

    const fullCount = userResult.rows.length > 0 ? parseInt(userResult.rows[0].full_count) : 0;

    return NextResponse.json({
      users: userResult.rows.map((r) => ({
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        partner_name: r.partner_name,
        product_name: r.product_name,
        debit_count: r.debit_count || 0,
        total_usage: parseFloat(r.total_usage) || 0,
        event_usage: parseFloat(r.event_usage) || 0,
        non_event_usage: parseFloat(r.non_event_usage) || 0,
        last_usage_at: r.last_usage_at,
        is_user_benar: r.is_user_benar === true || r.is_user_benar === "true",
      })),
      productRecap: productResult.rows.map((r) => ({
        product_name: r.product_name,
        unique_users: parseInt(r.unique_users) || 0,
        debit_count: r.debit_count,
        total_usage: parseFloat(r.total_usage) || 0,
      })),
      dailyTrend: trendResult.rows.map((r) => ({
        date: r.date,
        debit_events: parseInt(r.debit_events) || 0,
        unique_users: parseInt(r.unique_users) || 0,
        total_usage: parseFloat(r.total_usage) || 0,
      })),
      summary: {
        total_users: parseInt(summaryResult.rows[0]?.total_users) || 0,
        total_debits: parseInt(summaryResult.rows[0]?.total_debits) || 0,
        total_usage: parseFloat(summaryResult.rows[0]?.total_usage) || 0,
      },
      products: productsResult.rows.map((r) => r.product_name),
      partners: partnersResult.rows.map((r) => r.partner),
      pagination: {
        page,
        limit,
        total: fullCount,
        totalPages: Math.ceil(fullCount / limit),
      },
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return authErrorResponse(error);
  }
}
