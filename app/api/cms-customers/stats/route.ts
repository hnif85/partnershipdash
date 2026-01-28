import { NextResponse } from "next/server";
import { getCustomerStats } from "@/lib/cmsCustomers";

export async function GET() {
  try {
    const stats = await getCustomerStats();

    return NextResponse.json({
      total_users: stats.total_users,
      users_with_credit: stats.users_with_credit,
      users_with_debit: stats.users_with_debit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: message,
      total_users: 0,
      users_with_credit: 0,
      users_with_debit: 0
    }, { status: 500 });
  }
}
