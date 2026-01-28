import { NextResponse } from "next/server";
import { getDailySummary } from "@/lib/cmsCustomers";

export async function GET() {
  try {
    const summary = await getDailySummary();

    return NextResponse.json({
      ...summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Daily summary API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch daily summary data',
        daily_new_users: [],
        daily_purchases: [],
        total_new_users_month: 0,
        total_purchases_month: 0
      },
      { status: 500 }
    );
  }
}