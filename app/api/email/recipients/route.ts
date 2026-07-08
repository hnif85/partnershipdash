import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const search = request.nextUrl.searchParams.get("search") || "";

    // Multiple filter dimensions
    const filterPartner = request.nextUrl.searchParams.get("partner") || "";
    const filterDateFrom = request.nextUrl.searchParams.get("date_from") || "";
    const filterDateTo = request.nextUrl.searchParams.get("date_to") || "";
    const filterStatus = request.nextUrl.searchParams.get("status") || ""; // 'has_transaction', 'no_transaction', 'subscribed'
    const filterEvent = request.nextUrl.searchParams.get("event_id") || ""; // event ID
    const filterRecentDays = request.nextUrl.searchParams.get("recent_days") || ""; // '7', '30', '90'

    let whereClause = `c.email IS NOT NULL AND c.email != '' AND dee.email IS NULL`;
    const params: any[] = [];
    let paramIdx = 0;

    // Filter by partner
    if (filterPartner) {
      paramIdx++;
      params.push(filterPartner);
      whereClause += ` AND c.referal_code = $${paramIdx}`;
    }

    // Filter by date range (created_at)
    if (filterDateFrom) {
      paramIdx++;
      params.push(filterDateFrom);
      whereClause += ` AND c.created_at >= $${paramIdx}::timestamp`;
    }
    if (filterDateTo) {
      paramIdx++;
      params.push(filterDateTo);
      whereClause += ` AND c.created_at <= $${paramIdx}::timestamp`;
    }

    // Filter by recent days
    if (filterRecentDays) {
      paramIdx++;
      params.push(`${filterRecentDays} days`);
      whereClause += ` AND c.created_at >= NOW() - $${paramIdx}::interval`;
    }

    // Filter by status (has transaction from credit_manager_transactions)
    if (filterStatus === "has_transaction") {
      whereClause += ` AND EXISTS (SELECT 1 FROM credit_manager_transactions cmt WHERE cmt.customer_guid = c.guid)`;
    } else if (filterStatus === "no_transaction") {
      whereClause += ` AND NOT EXISTS (SELECT 1 FROM credit_manager_transactions cmt WHERE cmt.customer_guid = c.guid)`;
    } else if (filterStatus === "subscribed") {
      whereClause += ` AND EXISTS (SELECT 1 FROM user_products up WHERE up.customer_guid = c.guid AND up.status = 'Active')`;
    } else if (filterStatus === "unsubscribed") {
      whereClause += ` AND NOT EXISTS (SELECT 1 FROM user_products up WHERE up.customer_guid = c.guid AND up.status = 'Active')`;
    }

    // Filter by event attendance
    if (filterEvent) {
      paramIdx++;
      params.push(parseInt(filterEvent));
      whereClause += ` AND (c.email IN (SELECT er.email FROM event_registrations er WHERE er.event_id = $${paramIdx})
                           OR c.guid IN (SELECT er.customer_guid FROM event_registrations er WHERE er.event_id = $${paramIdx}))`;
    }

    // Search by name or email
    if (search) {
      paramIdx++;
      params.push(`%${search}%`);
      whereClause += ` AND (c.full_name ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx})`;
    }

    // Count total
    const countResult = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM cms_customers c
       LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || "0");

    // Get users
    paramIdx++;
    params.push(limit);
    paramIdx++;
    params.push(offset);

    const users = await executeQuery<any>(
      `SELECT c.guid, c.full_name, c.email, c.phone_number, c.referal_code AS partner, c.created_at
       FROM cms_customers c
       LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIdx - 1} OFFSET $${paramIdx}`,
      params
    );

    // Get partner stats for the filter dropdown
    const partnerStats = await executeQuery<any>(
      `SELECT c.referal_code as partner, COUNT(*)::int as count
       FROM cms_customers c
       LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
       WHERE dee.email IS NULL AND c.email IS NOT NULL AND c.email != '' AND c.referal_code IS NOT NULL
       GROUP BY c.referal_code
       ORDER BY count DESC`
    );

    // Get total available customers
    const totalAvailable = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM cms_customers c
       LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
       WHERE dee.email IS NULL AND c.email IS NOT NULL AND c.email != ''`
    );

    return NextResponse.json({
      total,
      totalAvailable: parseInt(totalAvailable[0]?.count || "0"),
      users,
      partnerStats,
      page: { limit, offset },
      filters: {
        partner: filterPartner,
        date_from: filterDateFrom,
        date_to: filterDateTo,
        status: filterStatus,
        event_id: filterEvent,
        recent_days: filterRecentDays,
        search,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
