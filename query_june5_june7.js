const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

async function main() {
  try {
    // Query 1: Ringkasan transaksi per tanggal
    console.log('=== RINGKASAN TRANSAKSI 5 & 7 JUNI 2026 ===\n');
    
    const summaryQuery = `
      SELECT 
        DATE(t.created_at) as tanggal,
        COUNT(DISTINCT t.guid) as jumlah_transaksi,
        COUNT(DISTINCT t.customer_guid) as jumlah_user_beli,
        SUM(t.grand_total) as total_revenue,
        t.valuta_code
      FROM transactions t
      WHERE t.created_at::date IN ('2026-06-05', '2026-06-07')
        AND LOWER(t.status) = 'finished'
      GROUP BY DATE(t.created_at), t.valuta_code
      ORDER BY tanggal;
    `;
    
    const summary = await pool.query(summaryQuery);
    console.log('Ringkasan per tanggal:');
    console.table(summary.rows);

    // Query 2: Detail transaksi
    console.log('\n=== DETAIL TRANSAKSI ===\n');
    
    const detailQuery = `
      SELECT 
        t.invoice_number,
        c.full_name as nama_customer,
        c.email,
        c.username,
        t.grand_total,
        t.valuta_code,
        t.status,
        t.created_at,
        t.payment_channel_name,
        td.product_name,
        td.purchase_type_name,
        td.qty
      FROM transactions t
      JOIN transaction_details td ON t.guid = td.transaction_guid
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      WHERE DATE(t.created_at) IN ('2026-06-05', '2026-06-07')
        AND LOWER(t.status) = 'finished'
      ORDER BY t.created_at DESC;
    `;
    
    const details = await pool.query(detailQuery);
    console.log(`Ditemukan ${details.rows.length} transaksi:\n`);
    
    details.rows.forEach((row, i) => {
      console.log(`--- Transaksi ${i + 1} ---`);
      console.log(`Invoice    : ${row.invoice_number}`);
      console.log(`Customer   : ${row.nama_customer || row.username || '-'}`);
      console.log(`Email      : ${row.email || '-'}`);
      console.log(`Produk     : ${row.product_name}`);
      console.log(`Tipe Beli  : ${row.purchase_type_name}`);
      console.log(`Jumlah     : ${row.qty}`);
      console.log(`Total      : ${row.grand_total} ${row.valuta_code}`);
      console.log(`Pembayaran : ${row.payment_channel_name}`);
      console.log(`Tanggal    : ${row.created_at}`);
      console.log('');
    });

    // Query 3: Semua transaksi 2-9 Juni untuk konteks
    console.log('\n=== SEMUA TRANSAKSI 2-9 JUNI 2026 (SEMUA STATUS) ===\n');
    
    const allQuery = `
      SELECT 
        DATE(t.created_at) as tanggal,
        COUNT(DISTINCT t.guid) as jumlah_transaksi,
        COUNT(DISTINCT t.customer_guid) as jumlah_user,
        SUM(CASE WHEN LOWER(t.status) = 'finished' THEN t.grand_total ELSE 0 END) as revenue_finished,
        SUM(CASE WHEN LOWER(t.status) = 'failed' THEN 1 ELSE 0 END) as transaksi_gagal,
        SUM(CASE WHEN LOWER(t.status) = 'pending' THEN 1 ELSE 0 END) as transaksi_pending
      FROM transactions t
      WHERE t.created_at::date BETWEEN '2026-06-02' AND '2026-06-09'
      GROUP BY DATE(t.created_at)
      ORDER BY tanggal;
    `;
    
    const allTrans = await pool.query(allQuery);
    console.log('Semua transaksi 2-9 Juni:');
    console.table(allTrans.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
