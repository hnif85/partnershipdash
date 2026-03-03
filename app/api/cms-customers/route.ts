import { NextRequest, NextResponse } from "next/server";
import { getCmsCustomers, getCmsCustomersCount, getReferralPartners } from "@/lib/cmsCustomers";

const fallbackError = (message: string) =>
  NextResponse.json({ error: message, customers: [], referralPartners: [], total_count: 0, page: 1, limit: 50, total_pages: 0 }, { status: 500 });

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let logDetails: string[] = [];
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const referralPartnerFilter = searchParams.get('referral_partner') || 'all';
    const appFilter = searchParams.get('appFilter') || 'all';
    const statusFilter = searchParams.get('statusFilter') || 'all';
    const churnFilter = searchParams.get('churnFilter') || 'all';

    const paramsTime = Date.now();
    logDetails.push(`Params parsing: ${paramsTime - startTime}ms`);

    const customersStart = Date.now();
    const customers = await getCmsCustomers(page, limit, search, referralPartnerFilter, appFilter, statusFilter, churnFilter);
    const customersTime = Date.now() - customersStart;
    logDetails.push(`getCmsCustomers (${customers.length} rows): ${customersTime}ms`);

    const referralStart = Date.now();
    const referralPartners = await getReferralPartners();
    const referralTime = Date.now() - referralStart;
    logDetails.push(`getReferralPartners (${referralPartners.length} rows): ${referralTime}ms`);

    const countStart = Date.now();
    const totalCount = await getCmsCustomersCount(search, referralPartnerFilter, appFilter, statusFilter, churnFilter);
    const countTime = Date.now() - countStart;
    logDetails.push(`getCmsCustomersCount: ${countTime}ms`);

    const totalTime = Date.now() - startTime;
    logDetails.push(`Total execution: ${totalTime}ms`);

    console.log(`[cms-customers API] ${logDetails.join(' | ')}`);

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
    const stack = error instanceof Error ? error.stack : "";
    const totalTime = Date.now() - startTime;
    console.error(`[cms-customers API] ERROR after ${totalTime}ms:`, message, stack);
    return fallbackError(message);
  }
}
