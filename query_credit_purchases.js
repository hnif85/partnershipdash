const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

async function main() {
  try {
    // Cek credit_manager_transactions untuk 2-9 Juni
    console.log('=== CREDIT MANAGER TRANSAKSI 2-9 JUNI 2026 ===\n');
    
    const creditQuery = `
      SELECT 
        DATE(cmt.created_at) as tanggal,
        cmt.type,
        cmt.product_name,
        COUNT(*) as jumlah,
        SUM(cmt.amount) as total_amount
      FROM credit_manager_transactions cmt
      WHERE cmt.created_at::date BETWEEN '2026-06-02' AND '2026-06-09'
      GROUP BY DATE(cmt.created_at), cmt.type, cmt.product_name
      ORDER BY tanggal, cmt.type;
    `;
    
    const creditResult = await pool.query(creditQuery);
    console.log('Credit transactions 2-9 Juni:');
    console.table(creditResult.rows);

    // Cek transaksi dengan grand_total > 0 di semua tanggal Juni
    console.log('\n=== TRANSAKSI BERBAYAR (grand_total > 0) BULAN JUNI 2026 ===\n');
    
    const paidQuery = `
      SELECT 
        DATE(t.created_at) as tanggal,
        t.invoice_number,
        c.full_name,
        c.email,
        t.grand_total,
        t.valuta_code,
        t.status,
        t.payment_channel_name,
        td.product_name
      FROM transactions t
      JOIN transaction_details td ON t.guid = td.transaction_guid
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      WHERE t.created_at::date >= '2026-06-01'
        AND t.created_at::date <= '2026-06-09'
        AND t.grand_total > 0
      ORDER BY t.created_at DESC;
    `;
    
    const paidResult = await pool.query(paidQuery);
    console.log(`Ditemukan ${paidResult.rows.length} transaksi berbayar:\n`);
    
    if (paidResult.rows.length > 0) {
      console.table(paidResult.rows);
    } else {
      console.log('TIDAK ADA transaksi berbayar di bulan Juni 2026!');
    }

    // Cek semua transaksi Juni (tanpa filter status)
    console.log('\n=== SEMUA TRANSAKSI JUNI 2026 (TERMASUK GAGAL/PENDING) ===\n');
    
    const allQuery = `
      SELECT 
        DATE(t.created_at) as tanggal,
        t.status,
        COUNT(*) as jumlah,
        SUM(t.grand_total) as total
      FROM transactions t
      WHERE t.created_at::date >= '2026-06-01'
        AND t.created_at::date <= '2026-06-09'
      GROUP BY DATE(t.created_at), t.status
      ORDER BY tanggal, t.status;
    `;
    
    const allResult = await pool.query(allQuery);
    console.table(allResult.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
