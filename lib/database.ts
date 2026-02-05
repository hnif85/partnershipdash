import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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