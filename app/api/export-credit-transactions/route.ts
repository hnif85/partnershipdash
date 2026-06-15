import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

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

    // First, update product_name in transactions where it's null but we have product data
    const updateQuery = `
      UPDATE credit_manager_transactions
      SET product_name = p.application_name,
          updated_at = NOW()
      FROM products p
      WHERE credit_manager_transactions.agent::text = p.agent_id::text
        AND credit_manager_transactions.product_name IS NULL
        AND credit_manager_transactions.created_at >= $1::timestamp
        AND credit_manager_transactions.created_at <= $2::timestamp
    `;

    await pool.query(updateQuery, [startDate + ' 00:00:00', endDate + ' 23:59:59']);

    // Query to get transaction data with user info and product info
    const query = `
      SELECT
        COALESCE(cc.full_name, 'Unknown User') as user_name,
        COALESCE(cc.email, '') as user_email,
        COALESCE(cmt.product_name, p.application_name, cmt.product_package, 'Unknown App') as app_name,
        cmt.type,
        cmt.amount,
        cmt.created_at as transaction_date
      FROM credit_manager_transactions cmt
      LEFT JOIN cms_customers cc ON cmt.user_id::text = cc.guid::text
      LEFT JOIN products p ON cmt.agent::text = p.agent_id::text
      WHERE cmt.created_at >= $1::timestamp
        AND cmt.created_at <= $2::timestamp
      ORDER BY cmt.created_at DESC
    `;

    const result = await pool.query(query, [startDate + ' 00:00:00', endDate + ' 23:59:59']);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the selected date range' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row, index) => ({
      'No': index + 1,
      'Nama User': row.user_name,
      'Email User': row.user_email,
      'Nama Aplikasi': row.app_name,
      'Tipe': row.type === 'credit' ? 'Credit (Penambahan)' : 'Debit (Penggunaan)',
      'Jumlah': row.amount,
      'Tanggal': new Date(row.transaction_date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 25 }, // Nama User
      { wch: 30 }, // Email User
      { wch: 20 }, // Nama Aplikasi
      { wch: 20 }, // Tipe
      { wch: 10 }, // Jumlah
      { wch: 20 }  // Tanggal
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Credit Transactions');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return file as response
    const response = new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=credit_transactions_${startDate}_to_${endDate}.xlsx`
      }
    });

    return response;

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
