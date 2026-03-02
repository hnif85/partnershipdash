import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  getCmsCustomers,
  getCmsCustomersCount,
  getReferralPartners,
} from "@/lib/cmsCustomers";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

const formatSubscriptions = (subscribeList: any, fallbackApps?: string[] | null) => {
  const collected = new Set<string>();

  if (Array.isArray(fallbackApps)) {
    fallbackApps.filter(Boolean).forEach((app) => collected.add(app));
  }

  if (subscribeList) {
    const list = Array.isArray(subscribeList) ? subscribeList : [subscribeList];
    list.forEach((item) => {
      const products = item?.product_list;
      if (Array.isArray(products)) {
        products.forEach((p) => {
          if (p?.product_name) {
            collected.add(p.product_name);
          }
        });
      }
    });
  }

  return collected.size ? Array.from(collected).join(", ") : "-";
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("statusFilter") || "all";
    const appFilter = searchParams.get("appFilter") || "all";
    const referralPartnerFilter = searchParams.get("referral_partner") || "all";
    const churnFilter = searchParams.get("churnFilter") || "all";

    // Determine total rows so we can fetch everything in one request.
    const totalCount = await getCmsCustomersCount(
      search,
      referralPartnerFilter,
      appFilter,
      statusFilter,
      churnFilter
    );

    if (totalCount === 0) {
      return NextResponse.json(
        { error: "Tidak ada data untuk filter yang dipilih." },
        { status: 404 }
      );
    }

    // Re-use existing query builder to keep filter logic identical to the table view.
    const customers = await getCmsCustomers(
      1,
      Math.max(totalCount, 1),
      search,
      referralPartnerFilter,
      appFilter,
      statusFilter,
      churnFilter
    );

    const referralPartners = await getReferralPartners();
    const referralMap = new Map(
      referralPartners
        .filter((rp) => rp.code)
        .map((rp) => [rp.code as string, rp.partner || ""])
    );

    const rows = customers.map((c, idx) => ({
      No: idx + 1,
      "Nama": c.full_name || "",
      "Email": c.email || "",
      "No. Telepon": c.phone_number || "",
      "Referral Code": c.referal_code || "",
      "Partner": referralMap.get(c.referal_code || "") || "-",
      "Churn Status": c.churn_status || "-",
      "Credit Ditambahkan": c.credit_added ?? 0,
      "Credit Terpakai": c.credit_used ?? 0,
      "Aplikasi": formatSubscriptions(c.subscribe_list, c.applications),
      "Terakhir Debit": formatDate(c.last_debit_at),
      "Dibuat": formatDate(c.created_at),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
      { wch: 22 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Customers");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const now = new Date();
    const filename = `customers_filtered_${now
      .toISOString()
      .replace(/[:.-]/g, "")
      .slice(0, 15)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error("Export customers failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
