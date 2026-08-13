import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import * as XLSX from "xlsx";

const PAID_PREDICATE = `
  LOWER(t.status) = 'finished'
  AND td.product_price > 10000
  AND td.product_name NOT ILIKE '%free trial%'
  AND td.product_name NOT ILIKE '%freetrial%'
  AND td.product_name NOT ILIKE '%seo%'
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const partner = searchParams.get("partner") || "";

    if (!from && !to && !partner) {
      return NextResponse.json(
        { error: "Isi minimal salah satu filter: rentang tanggal last purchase (from/to) atau partner" },
        { status: 400 }
      );
    }

    let paramIdx = 1;
    const params: Array<string | number> = [];

    let partnerCondition = "";
    if (partner) {
      partnerCondition = ` AND rp.partner = $${paramIdx++}`;
      params.push(partner);
    }

    const havingConditions: string[] = [];
    if (from) {
      havingConditions.push(`MAX(t.created_at) >= $${paramIdx++}::date`);
      params.push(from);
    }
    if (to) {
      havingConditions.push(`MAX(t.created_at) < ($${paramIdx++}::date + 1)`);
      params.push(to);
    }
    const havingClause = havingConditions.length > 0 ? ` HAVING ${havingConditions.join(" AND ")}` : "";

    const query = `
      WITH eligible AS (
        SELECT c.guid
        FROM cms_customers c
        LEFT JOIN referral_partners rp ON rp.code = c.referal_code
        LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
        WHERE dee.email IS NULL
          ${partnerCondition}
          AND c.guid IN (
            SELECT t.customer_guid
            FROM transactions t
            JOIN transaction_details td ON td.transaction_guid = t.guid
            WHERE ${PAID_PREDICATE}
            GROUP BY t.customer_guid
            ${havingClause}
          )
      )
      SELECT
        c.email,
        COALESCE(c.full_name, c.username, '') as nama,
        COALESCE(rp.partner, 'Organik') as partner,
        COUNT(DISTINCT t.guid)::int as total_transaksi,
        COUNT(DISTINCT UPPER(SPLIT_PART(td.product_name, ' - ', 1)))::int as jumlah_aplikasi,
        MIN(t.created_at) as tanggal_pertama,
        MAX(t.created_at) as tanggal_terakhir,
        COALESCE(SUM(t.grand_total), 0) as total_belanja_idr,
        STRING_AGG(DISTINCT UPPER(SPLIT_PART(td.product_name, ' - ', 1)), ', ') as daftar_aplikasi,
        STRING_AGG(
          '#' || t.invoice_number || ' | ' || to_char(t.created_at, 'DD-MM-YYYY') || ' | ' || td.product_name || ' | Rp' || COALESCE(t.grand_total, 0)::text,
          chr(10) ORDER BY t.created_at
        ) as detail_transaksi
      FROM eligible e
      JOIN cms_customers c ON c.guid = e.guid
      JOIN transactions t ON t.customer_guid = c.guid
      JOIN transaction_details td ON td.transaction_guid = t.guid
      LEFT JOIN referral_partners rp ON rp.code = c.referal_code
      WHERE ${PAID_PREDICATE}
      GROUP BY c.email, c.full_name, c.username, rp.partner
      ORDER BY total_transaksi DESC, total_belanja_idr DESC
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data pembelian untuk filter tersebut" },
        { status: 404 }
      );
    }

    const excelData = result.rows.map((row, index) => ({
      "No": index + 1,
      "Email": row.email,
      "Nama": row.nama,
      "Partner": row.partner,
      "Total Transaksi (berapa kali beli)": row.total_transaksi,
      "Total Belanja (Rp)": Number(row.total_belanja_idr),
      "Jumlah Aplikasi": row.jumlah_aplikasi,
      "Aplikasi Dibeli": row.daftar_aplikasi,
      "Tgl Pembelian Pertama": row.tanggal_pertama ? new Date(row.tanggal_pertama).toISOString().split("T")[0] : "",
      "Tgl Pembelian Terakhir": row.tanggal_terakhir ? new Date(row.tanggal_terakhir).toISOString().split("T")[0] : "",
      "Detail Transaksi": row.detail_transaksi,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 5 },
      { wch: 32 },
      { wch: 25 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 80 },
    ];

    const detailRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let r = 1; r <= detailRange.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 10 });
      if (ws[addr]) ws[addr].z = "@";
    }

    XLSX.utils.book_append_sheet(wb, ws, "Pembelian per Email");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const label = partner ? `_${partner.replace(/[^a-z0-9]+/gi, "_")}` : "";
    const filename = `pembelian_per_email${label}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Purchases export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}