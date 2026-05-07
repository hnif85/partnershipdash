import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const daysBack = 30;
    const defaultEndDate = new Date().toISOString().split("T")[0];
    const defaultStartDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate ? new Date(endDate + 'T23:59:59').toISOString() : defaultEndDate + 'T23:59:59';

    const overviewQuery = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated_count,
        COALESCE(SUM(unread_count), 0)::int AS unread_count
      FROM helpdesk_conversations_v2
      WHERE created_at >= $1 AND created_at <= $2
    `;

    const leadDistributionQuery = `
      SELECT 
        COALESCE(lead_category, 'cold') AS category,
        COUNT(*)::int AS count
      FROM helpdesk_conversations_v2
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY COALESCE(lead_category, 'cold')
    `;

    const topIntentsQuery = `
      SELECT 
        COALESCE(last_intent, 'unknown') AS intent,
        COUNT(*)::int AS count
      FROM helpdesk_conversations_v2
      WHERE created_at >= $1 AND created_at <= $2
        AND last_intent IS NOT NULL
      GROUP BY COALESCE(last_intent, 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `;

    const dailyTrendsQuery = `
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS conversations,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
      FROM helpdesk_conversations_v2
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const dailyMessagesQuery = `
      SELECT 
        DATE(created_at) AS date,
        COUNT(*)::int AS messages
      FROM helpdesk_messages_v2
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const aiPerformanceQuery = `
      SELECT 
        COUNT(*)::int AS total_messages,
        COUNT(*) FILTER (WHERE sender_type = 'ai')::int AS ai_messages,
        COUNT(*) FILTER (WHERE sender_type = 'agent')::int AS agent_messages,
        COUNT(*) FILTER (WHERE intent_detected = 'error' OR intent_detected IS NULL) AS error_messages
      FROM helpdesk_messages_v2
      WHERE created_at >= $1 AND created_at <= $2
        AND direction = 'outbound'
    `;

    const [
      overviewRes,
      leadDistRes,
      topIntentsRes,
      dailyTrendsRes,
      dailyMessagesRes,
      aiPerfRes
    ] = await Promise.all([
      pool.query(overviewQuery, [effectiveStartDate, effectiveEndDate]),
      pool.query(leadDistributionQuery, [effectiveStartDate, effectiveEndDate]),
      pool.query(topIntentsQuery, [effectiveStartDate, effectiveEndDate]),
      pool.query(dailyTrendsQuery, [effectiveStartDate, effectiveEndDate]),
      pool.query(dailyMessagesQuery, [effectiveStartDate, effectiveEndDate]),
      pool.query(aiPerformanceQuery, [effectiveStartDate, effectiveEndDate])
    ]);

    const overview = overviewRes.rows[0] || {
      total: 0, open_count: 0, resolved_count: 0, pending_count: 0, escalated_count: 0, unread_count: 0
    };

    const leadDistribution: Record<string, number> = { hot: 0, warm: 0, medium: 0, cold: 0 };
    for (const row of leadDistRes.rows) {
      const cat = row.category || 'cold';
      if (cat === 'hot' || cat === 'warm' || cat === 'medium' || cat === 'cold') {
        leadDistribution[cat] = row.count;
      }
    }

    const topIntents = topIntentsRes.rows.map(row => ({
      intent: row.intent,
      count: row.count
    }));

    const dailyTrendsMap = new Map<string, { conversations: number; resolved: number; messages: number }>();
    for (const row of dailyTrendsRes.rows) {
      const dateKey = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0];
      dailyTrendsMap.set(dateKey, { conversations: Number(row.conversations), resolved: Number(row.resolved), messages: 0 });
    }
    for (const row of dailyMessagesRes.rows) {
      const dateKey = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0];
      const existing = dailyTrendsMap.get(dateKey) || { conversations: 0, resolved: 0, messages: 0 };
      existing.messages = Number(row.messages);
      dailyTrendsMap.set(dateKey, existing);
    }

    const dailyTrends = Array.from(dailyTrendsMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const aiPerf = aiPerfRes.rows[0] || { total_messages: 0, ai_messages: 0, agent_messages: 0, error_messages: 0 };
    const totalOutbound = aiPerf.total_messages || 1;
    const handledByAI = Math.round((aiPerf.ai_messages / totalOutbound) * 100);
    const successRate = totalOutbound > 0 
      ? Math.round(((totalOutbound - aiPerf.error_messages) / totalOutbound) * 100)
      : 100;

    return NextResponse.json({
      overview: {
        total: overview.total,
        open: overview.open_count,
        resolved: overview.resolved_count,
        pending: overview.pending_count,
        escalated: overview.escalated_count,
        unread: overview.unread_count
      },
      leadDistribution,
      topIntents,
      dailyTrends,
      aiPerformance: {
        handledByAI,
        successRate,
        totalMessages: aiPerf.total_messages,
        aiMessages: aiPerf.ai_messages,
        agentMessages: aiPerf.agent_messages
      },
      dateRange: {
        start: effectiveStartDate,
        end: effectiveEndDate
      }
    });
  } catch (error) {
    console.error("Helpdesk analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}