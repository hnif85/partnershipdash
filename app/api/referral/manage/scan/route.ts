import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

// POST /api/referral/manage/scan - Scan referrals from cms_customers
export async function POST(request: Request) {
  try {
    // Get distinct referral codes from cms_customers that are not null/empty and don't exist in referral_partners
    const getDistinctCodesQuery = `
      SELECT DISTINCT referal_code
      FROM cms_customers
      WHERE referal_code IS NOT NULL
        AND TRIM(referal_code) != ''
        AND referal_code NOT IN (
          SELECT code FROM referral_partners WHERE code IS NOT NULL
        )
      ORDER BY referal_code
    `;

    const distinctCodesResult = await pool.query(getDistinctCodesQuery);
    const codes = distinctCodesResult.rows.map(row => row.referal_code);

    if (codes.length === 0) {
      return NextResponse.json({
        message: "No new referral codes found to scan",
        scanned: 0,
        codes: []
      });
    }

    // Insert new referral partners for each code using parameterized queries
    for (const code of codes) {
      const insertQuery = `
        INSERT INTO referral_partners (code, partner, is_gov, is_new, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `;
      await pool.query(insertQuery, [code, code, false, true]);
    }

    return NextResponse.json({
      message: `Successfully scanned and added ${codes.length} new referral codes`,
      scanned: codes.length,
      codes
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral scan error:", error);
    return NextResponse.json({
      error: message,
      scanned: 0,
      codes: []
    }, { status: 500 });
  }
}