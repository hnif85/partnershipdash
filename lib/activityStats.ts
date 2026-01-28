import { Pool } from "pg";

export type ActivityStats = {
  target: number;
  achieved: number;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

// Stats for Gov & Non-Gov Offline Activation based on real data.
// Target defaults to 1000 trx but can be overridden via env GOV_NON_GOV_TARGET.
export async function getGovNonGovStats(): Promise<ActivityStats> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const target =
    Number(process.env.GOV_NON_GOV_TARGET) && Number(process.env.GOV_NON_GOV_TARGET) > 0
      ? Number(process.env.GOV_NON_GOV_TARGET)
      : 1000;

  const { rows } = await pool.query<{ achieved: string | number | null }>(`
    WITH partner_users AS (
      SELECT c.guid::uuid AS user_id
      FROM cms_customers c
      WHERE c.referal_code IS NOT NULL
        AND c.guid IS NOT NULL
        AND c.guid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    SELECT COUNT(*) AS achieved
    FROM credit_manager_transactions cmt
    WHERE LOWER(cmt.type) = 'credit'
      AND cmt.user_id IN (SELECT user_id FROM partner_users)
  `);

  const achieved = Number(rows[0]?.achieved) || 0;

  return { target, achieved };
}
