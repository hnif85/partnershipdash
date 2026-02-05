// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Parse DATABASE_URL manually for CLI
import { Pool } from 'pg';

const useSsl = !!process.env.DATABASE_URL && /supabase\.co|pooler\.supabase|amazonaws\.com/i.test(process.env.DATABASE_URL || '');

let localPool: Pool;
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    localPool = new Pool({
      user: url.username,
      password: url.password as string,
      host: url.host.split(':')[0],
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 5,
    });
    console.log('Local pool created successfully');
  } catch(e) {
    console.error('Failed to parse DB URL:', e);
    process.exit(1);
  }
} else {
  console.error('No DATABASE_URL');
  process.exit(1);
}


// Diagnostic logging
console.log('DB URL present:', !!process.env.DATABASE_URL);
console.log('DB URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('DB user:', url.username);
    console.log('DB password present:', !!url.password);
    console.log('DB host:', url.host);
    console.log('DB port:', url.port);
    console.log('DB path:', url.pathname);
  } catch(e: unknown) {
    console.log('Invalid DB URL:', (e as Error).message);
  }
}

(async () => {
  try {
    console.log('=== CMS Customers ===');
    const totalCust = await pool.query('SELECT COUNT(*)::int as count FROM cms_customers');
    console.log('Total cms_customers:', totalCust.rows[0].count);

    const exclCust = await pool.query('SELECT COUNT(*)::int as count FROM cms_customers c LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true WHERE dee.email IS NULL');
    console.log('Total excluding demos:', exclCust.rows[0].count);

    console.log('\n=== Credit Manager Transactions ===');
    const creditUsers = await pool.query("SELECT COUNT(DISTINCT user_id)::int as count FROM credit_manager_transactions WHERE LOWER(type) = 'credit'");
    console.log('Users with credit:', creditUsers.rows[0].count);

    const debitUsers = await pool.query("SELECT COUNT(DISTINCT user_id)::int as count FROM credit_manager_transactions WHERE LOWER(type) = 'debit'");
    console.log('Users with debit:', debitUsers.rows[0].count);

    const cmUsers = await pool.query("SELECT COUNT(DISTINCT user_id)::int as count FROM credit_manager_transactions");
    console.log('Total unique users in credit_manager_transactions:', cmUsers.rows[0].count);

    console.log('\n=== Transactions (IDR finished) ===');
    const txUsers = await pool.query(`SELECT COUNT(DISTINCT t.customer_guid)::int as count 
      FROM transactions t 
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid 
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true 
      WHERE UPPER(t.valuta_code) = 'IDR' AND LOWER(t.status) = 'finished' AND dee.email IS NULL`);
    console.log('Users with IDR finished tx:', txUsers.rows[0].count);

    console.log('\n=== Subscriptions ===');
    const subsUsers = await pool.query('SELECT COUNT(*)::int as count FROM cms_customers WHERE subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0');
    console.log('Users with non-empty subscribe_list:', subsUsers.rows[0].count);

    const activeSubsUsers = await pool.query(`
      SELECT COUNT(DISTINCT c.guid)::int as count 
      FROM cms_customers c 
      WHERE c.subscribe_list IS NOT NULL 
      AND jsonb_array_length(c.subscribe_list) > 0
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.subscribe_list) AS sub, 
        jsonb_array_elements(sub->'product_list') AS prod 
        WHERE (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP
      )
    `);
    console.log('Users with active subscriptions:', activeSubsUsers.rows[0].count);

    console.log('\n=== Active Customers (tx or sub) ===');
    const activeCust = await pool.query(`
      SELECT COUNT(DISTINCT COALESCE(t.customer_guid, c.guid))::int as count
      FROM cms_customers c
      LEFT JOIN transactions t ON t.customer_guid = c.guid AND UPPER(t.valuta_code) = 'IDR' AND LOWER(t.status) = 'finished'
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      WHERE dee.email IS NULL
      AND (t.customer_guid IS NOT NULL OR (c.subscribe_list IS NOT NULL AND jsonb_array_length(c.subscribe_list) > 0))
    `);
    console.log('Active customers (IDR tx or any sub):', activeCust.rows[0].count);

  } catch (error) {
    console.error('Query error:', error);
  } finally {
    await pool.end();
  }
})();
