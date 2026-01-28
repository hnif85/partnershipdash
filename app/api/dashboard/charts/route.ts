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
        DATE(created_at) as date,
        COUNT(CASE WHEN type = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN type = 'debit' THEN 1 END) as debit_count,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as credit_amount,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as debit_amount,
        COUNT(DISTINCT CASE WHEN type = 'credit' THEN user_id END) as unique_credit_users,
        COUNT(DISTINCT CASE WHEN type = 'debit' THEN user_id END) as unique_debit_users
      FROM credit_manager_transactions
      WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
      GROUP BY DATE(created_at)
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
