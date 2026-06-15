import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Credit/Debit frequency by date range
    const chartDataQuery = `
      SELECT
        DATE(cmt.created_at) as date,
        COUNT(CASE WHEN cmt.type = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN cmt.type = 'debit' THEN 1 END) as debit_count,
        SUM(CASE WHEN cmt.type = 'credit' THEN cmt.amount ELSE 0 END) as credit_amount,
        SUM(CASE WHEN cmt.type = 'debit' THEN cmt.amount ELSE 0 END) as debit_amount,
        COUNT(DISTINCT CASE WHEN cmt.type = 'credit' THEN cmt.user_id END) as unique_credit_users,
        COUNT(DISTINCT CASE WHEN cmt.type = 'debit' THEN cmt.user_id END) as unique_debit_users
      FROM credit_manager_transactions cmt
      JOIN cms_customers c ON c.guid::uuid = cmt.user_id
      LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
      WHERE DATE(cmt.created_at) >= $1 AND DATE(cmt.created_at) <= $2
        AND dee.email IS NULL
      GROUP BY DATE(cmt.created_at)
      ORDER BY date ASC
    `;

    const result = await pool.query(chartDataQuery, [startDate, endDate]);

    const chartData = {
      data: result.rows,
      startDate,
      endDate,
      totalDays: result.rows.length,
      totalCredits: result.rows.reduce((sum, row) => sum + parseInt(row.credit_count), 0),
      totalDebits: result.rows.reduce((sum, row) => sum + parseInt(row.debit_count), 0),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
