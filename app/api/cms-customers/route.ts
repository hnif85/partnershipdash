import { NextRequest, NextResponse } from "next/server";
import { getCmsCustomers, getCmsCustomersCount, getReferralPartners } from "@/lib/cmsCustomers";

const fallbackError = (message: string) =>
  NextResponse.json({ error: message, customers: [], referralPartners: [], total_count: 0, page: 1, limit: 50, total_pages: 0 }, { status: 500 });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const referralPartnerFilter = searchParams.get('referral_partner') || 'all';
    const appFilter = searchParams.get('appFilter') || 'all';
    const statusFilter = searchParams.get('statusFilter') || 'all';

    const [customers, referralPartners, totalCount] = await Promise.all([
      getCmsCustomers(page, limit, search, referralPartnerFilter, appFilter, statusFilter),
      getReferralPartners(),
      getCmsCustomersCount(search, referralPartnerFilter, appFilter, statusFilter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      customers,
      referralPartners,
      total_count: totalCount,
      page,
      limit,
      total_pages: totalPages,
      search,
      referral_partner_filter: referralPartnerFilter,
      app_filter: appFilter
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return fallbackError(message);
  }
}
