import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read usage.csv
    const csvPath = path.join(process.cwd(), 'docs', 'usage.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n').slice(1); // skip header
    const emails = [...new Set(lines.map(line => line.trim()).filter(Boolean))];

    const results: any[] = [];

    for (const email of emails) {
      // Get user_id
      const userQuery = `
        SELECT id FROM credit_manager_users WHERE email = $1
      `;
      const userResult = await pool.query(userQuery, [email]);
      if (userResult.rows.length === 0) {
        results.push({ email, data: {} });
        continue;
      }
      const userId = userResult.rows[0].id;

      // Get aggregates per product
      const aggQuery = `
        SELECT 
          product_name,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as pembelian,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) as penggunaan,
          0 as expired
        FROM credit_manager_transactions 
        WHERE user_id = $1 AND product_name IS NOT NULL
        GROUP BY product_name
      `;
      const aggResult = await pool.query(aggQuery, [userId]);

      const emailData: any = { email };
      aggResult.rows.forEach((row: any) => {
        emailData[row.product_name] = {
          pembelian: parseFloat(row.pembelian),
          penggunaan: parseFloat(row.penggunaan),
          expired: parseFloat(row.expired)
        };
      });
      results.push(emailData);
    }

    // Generate CSV
    let csvOutput = 'email';
    // Add headers for apps dynamically, but since many, perhaps flat: email,app,pembelian,penggunaan,expired repeated
    // For simplicity, output JSON first, or make flat CSV

    const flatRows: string[] = [];
    flatRows.push('email,app,pembelian,penggunaan,expired');

    for (const result of results) {
      const emailApps = Object.keys(result).filter(k => k !== 'email');
      if (emailApps.length === 0) {
        flatRows.push(`${result.email},,0,0,0`);
      } else {
        for (const app of emailApps) {
          const data = result[app];
          flatRows.push(`${result.email},${app},${data.pembelian},${data.penggunaan},${data.expired}`);
        }
      }
    }
    const enrichedCsv = flatRows.join('\n');

    // Write to file
    const outputPath = path.join(process.cwd(), 'docs', 'usage_enriched.csv');
    fs.writeFileSync(outputPath, enrichedCsv);

    return NextResponse.json({
      success: true,
      count: emails.length,
      output_file: 'docs/usage_enriched.csv',
      sample: results.slice(0, 3)
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}