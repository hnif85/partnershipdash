import { Pool } from 'pg';

const useSsl =
  !!process.env.DATABASE_URL &&
  /supabase\.co|pooler\.supabase|amazonaws\.com/i.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase (and most hosted Postgres) require TLS; allow self-signed certs in dev.
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
  // Give hosted DB more time to accept the connection.
  connectionTimeoutMillis: 10000,
});

pool.on('connect', (client: any) => {
});

pool.on('error', (err: any, client: any) => {
  console.error('Unexpected error on idle client', err);
});

process.on('SIGINT', () => {
  console.log('Closing database pool...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

export { pool };

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function executeQuerySingle<T = any>(
  query: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0] : null;
}
