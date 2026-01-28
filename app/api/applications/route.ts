import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT DISTINCT prod->>'product_name' as app_name
      FROM cms_customers c,
           jsonb_array_elements(c.subscribe_list) AS sub,
           jsonb_array_elements(sub->'product_list') AS prod
      WHERE c.subscribe_list IS NOT NULL
        AND jsonb_array_length(c.subscribe_list) > 0
        AND prod->>'product_name' IS NOT NULL
      ORDER BY app_name
    `;

    const result = await pool.query(query);

    const applications = result.rows.map(row => row.app_name);

    return NextResponse.json({
      applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Applications API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
