import { pool } from "./database";

type CmsCustomerRow = {
  guid?: string;
  username?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  city?: string;
  country?: string;
  status?: string;
  is_active?: string;
  is_email_verified?: boolean;
  is_phone_number_verified?: boolean;
  referal_code?: string;
  created_at?: string;
  updated_at?: string;
  gender?: string;
  birth_date?: string;
  identity_number?: string;
  identity_img?: string;
  country_id?: number;
  city_id?: number;
  is_identity_verified?: boolean;
  bank_name?: string;
  bank_account_number?: string;
  bank_owner_name?: string;
  corporate_name?: string;
  industry_name?: string;
  employee_qty?: number;
  solution_corporate_needs?: string;
  is_free_trial_use?: boolean;
  created_by_guid?: string;
  created_by_name?: string;
  updated_by_guid?: string;
  updated_by_name?: string;
  subscribe_list?: unknown;
  credit_added?: number;
  credit_used?: number;
  last_debit_at?: string | null;
  churn_status?: string | null;
  applications?: string[];
  app_credits?: Array<{
    product_name: string;
    credit_added: number;
    credit_used: number;
    credit_events?: Array<{ date: string; amount: number }> | null;
    debit_events?: Array<{ date: string; amount: number }> | null;
  }>;
  training_data?: Array<{
    nama?: string | null;
    jenis_usaha?: string | null;
    no_hp?: string[] | null;
    nama_training?: string | null;
    model_training?: string | null;
    partner?: string | null;
    tanggal_input_data?: string | null;
    tanggal_input_trial?: string | null;
    akun_aktif_expired?: string | null;
    username_trial?: string | null;
    klasifikasi?: string | null;
    total_credit_tx?: number | null;
    total_debit_tx?: number | null;
    total_credits?: number | null;
    total_debits?: number | null;
    latest_balance?: number | null;
    credit_usage?: string | null;
    sudah_membeli_credit?: string | null;
    event_date?: string | null;
    created_at?: string | null;
  }> | null;
};

export type CmsCustomer = CmsCustomerRow;
export type ReferralPartner = { partner?: string; code?: string };

const mapCustomer = (c: CmsCustomerRow): CmsCustomer => ({
  ...c,
  status: c.status || c.is_active || "",
  full_name: c.full_name || c.username || c.email || "Unknown User",
  email: c.email || "",
  phone_number: c.phone_number || "",
  city: c.city || "",
  country: c.country || "",
  referal_code: c.referal_code || "",
  applications: c.applications || [],
  app_credits: c.app_credits || [],
  training_data: c.training_data || [],
  churn_status: c.churn_status || null,
  last_debit_at: c.last_debit_at || null,
});

async function addMailinatorToExcluded(emails: string[]) {
  if (emails.length === 0 || !process.env.DATABASE_URL) return;

  await pool.query(
    `INSERT INTO demo_excluded_emails (email, reason, is_active, created_at, updated_at)
     SELECT unnest($1::text[]), 'akun demo otomatis', true, NOW(), NOW()
     ON CONFLICT (email) DO NOTHING`,
    [emails]
  );
}

export async function getCmsCustomers(
  page: number = 1,
  limit: number = 50,
  search: string = '',
  referralPartnerFilter: string = 'all',
  appFilter: string = 'all',
  statusFilter: string = 'all',
  churnFilter: string = 'all'
): Promise<CmsCustomer[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const offset = (page - 1) * limit;

  // Build WHERE conditions
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(
      c.username ILIKE $${paramIndex} OR
      c.full_name ILIKE $${paramIndex + 1} OR
      c.email ILIKE $${paramIndex + 2}
    )`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    paramIndex += 3;
  }

  if (referralPartnerFilter !== 'all') {
    whereConditions.push(`c.referal_code = $${paramIndex}`);
    params.push(referralPartnerFilter);
    paramIndex += 1;
  }

  // Handle statusFilter (subscription status)
  if (statusFilter === 'without_apps') {
    whereConditions.push(`(subscribe_list IS NULL OR jsonb_array_length(subscribe_list) = 0)`);
  } else if (statusFilter === 'with_apps') {
    whereConditions.push(`subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0`);
  } else if (statusFilter === 'expired_apps') {
    // Filter by users with expired subscriptions
    whereConditions.push(`subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(subscribe_list) AS sub, jsonb_array_elements(sub->'product_list') AS prod WHERE (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP)`);
  } else if (statusFilter === 'expiring_soon') {
    // Akan expired dalam 7 hari ke depan
    whereConditions.push(`subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0 AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(subscribe_list) AS sub,
           jsonb_array_elements(sub->'product_list') AS prod
      WHERE (prod->>'expired_at')::timestamp >= CURRENT_TIMESTAMP
        AND (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP + INTERVAL '7 days'
    )`);
  }

  // Handle appFilter (specific application) - only if status allows subscriptions
  if (appFilter !== 'all' && statusFilter !== 'without_apps') {
    // Filter by specific application name
    whereConditions.push(`subscribe_list IS NOT NULL AND jsonb_array_length(subscribe_list) > 0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(subscribe_list) AS sub, jsonb_array_elements(sub->'product_list') AS prod WHERE prod->>'product_name' = $${paramIndex})`);
    params.push(appFilter);
    paramIndex += 1;
  }

  // Handle churnFilter based on last debit usage
  if (churnFilter === 'aktif') {
    whereConditions.push(`EXISTS (
      SELECT 1
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
        AND cmt_debit.created_at >= NOW() - INTERVAL '7 days'
    )`);
  } else if (churnFilter === 'idle') {
    whereConditions.push(`EXISTS (
      SELECT 1
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
    ) AND (
      SELECT MAX(cmt_debit.created_at)
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
    ) < NOW() - INTERVAL '7 days' AND (
      SELECT MAX(cmt_debit.created_at)
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
    ) >= NOW() - INTERVAL '30 days'`);
  } else if (churnFilter === 'pasif') {
    whereConditions.push(`(
      NOT EXISTS (
        SELECT 1
        FROM credit_manager_transactions cmt_debit
        WHERE cmt_debit.user_id = c.guid::uuid
          AND LOWER(cmt_debit.type) = 'debit'
      )
      OR (
        SELECT MAX(cmt_debit.created_at)
        FROM credit_manager_transactions cmt_debit
        WHERE cmt_debit.user_id = c.guid::uuid
          AND LOWER(cmt_debit.type) = 'debit'
      ) < NOW() - INTERVAL '30 days'
    )`);
  }

  const whereClauseBase = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const demoFilter = whereConditions.length > 0 ? ' AND dee.email IS NULL' : ' WHERE dee.email IS NULL';

  // Optimized query using JOIN instead of subqueries for better performance
  const query = `
    SELECT c.guid,
           c.username,
           c.full_name,
           c.email,
           c.phone_number,
           c.city,
           c.country,
           c.status,
           c.is_active,
           c.is_email_verified,
           c.is_phone_number_verified,
           c.referal_code,
           c.created_at,
           c.updated_at,
           c.gender,
           c.birth_date,
           c.identity_number,
           c.identity_img,
           c.country_id,
           c.city_id,
           c.is_identity_verified,
           c.bank_name,
           c.bank_account_number,
           c.bank_owner_name,
           c.corporate_name,
           c.industry_name,
           c.employee_qty,
           c.solution_corporate_needs,
           c.is_free_trial_use,
           c.created_by_guid,
           c.created_by_name,
           c.updated_by_guid,
           c.updated_by_name,
           c.subscribe_list,
           COALESCE(credit_totals.credit_added, 0) AS credit_added,
           COALESCE(credit_totals.credit_used, 0) AS credit_used,
           debit_stats.last_debit_at,
           CASE
             WHEN debit_stats.last_debit_at IS NULL THEN 'pasif'
             WHEN debit_stats.last_debit_at < NOW() - INTERVAL '30 days' THEN 'pasif'
             WHEN debit_stats.last_debit_at < NOW() - INTERVAL '7 days' THEN 'idle'
             ELSE 'aktif'
           END AS churn_status,
           COALESCE(app_totals.applications, ARRAY[]::text[]) AS applications,
           NULL AS app_credits,
           NULL AS training_data
    FROM cms_customers c
    LEFT JOIN (
      SELECT
        cmt.user_id,
        SUM(CASE WHEN LOWER(cmt.type) = 'credit' THEN cmt.amount ELSE 0 END) AS credit_added,
        SUM(CASE WHEN LOWER(cmt.type) = 'debit' THEN cmt.amount ELSE 0 END) AS credit_used
      FROM credit_manager_transactions cmt
      GROUP BY cmt.user_id
    ) credit_totals ON credit_totals.user_id = c.guid::uuid
    LEFT JOIN (
      SELECT
        cmt.user_id,
        MAX(cmt.created_at) FILTER (WHERE LOWER(cmt.type) = 'debit') AS last_debit_at
      FROM credit_manager_transactions cmt
      GROUP BY cmt.user_id
    ) debit_stats ON debit_stats.user_id = c.guid::uuid
    LEFT JOIN (
      SELECT
        cmt.user_id,
        array_agg(DISTINCT cmt.product_name) AS applications
      FROM credit_manager_transactions cmt
      WHERE cmt.product_name IS NOT NULL
      GROUP BY cmt.user_id
    ) app_totals ON app_totals.user_id = c.guid::uuid
    LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
    ${whereClauseBase}${demoFilter}
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const result = await pool.query<CmsCustomerRow>(query, params);

  // Add mailinator emails to excluded list
  const mailinatorEmails = result.rows
    .filter(row => row.email && row.email.endsWith("@mailinator.com"))
    .map(row => row.email as string)
    .filter((email, index, arr) => arr.indexOf(email) === index); // unique

  await addMailinatorToExcluded(mailinatorEmails);

  return result.rows.map(mapCustomer);
}

export async function getCmsCustomersCount(search: string = '', referralPartnerFilter: string = 'all', appFilter: string = 'all', statusFilter: string = 'all', churnFilter: string = 'all'): Promise<number> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Build WHERE conditions for count query
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(
      c.username ILIKE $${paramIndex} OR
      c.full_name ILIKE $${paramIndex + 1} OR
      c.email ILIKE $${paramIndex + 2}
    )`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    paramIndex += 3;
  }

  if (referralPartnerFilter !== 'all') {
    whereConditions.push(`c.referal_code = $${paramIndex}`);
    params.push(referralPartnerFilter);
    paramIndex += 1;
  }

  // Handle statusFilter (subscription status)
  if (statusFilter === 'without_apps') {
    whereConditions.push(`(c.subscribe_list IS NULL OR jsonb_array_length(c.subscribe_list) = 0)`);
  } else if (statusFilter === 'with_apps') {
    whereConditions.push(`c.subscribe_list IS NOT NULL AND jsonb_array_length(c.subscribe_list) > 0`);
  } else if (statusFilter === 'expired_apps') {
    // Filter by users with expired subscriptions
    whereConditions.push(`c.subscribe_list IS NOT NULL AND jsonb_array_length(c.subscribe_list) > 0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.subscribe_list) AS sub, jsonb_array_elements(sub->'product_list') AS prod WHERE (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP)`);
  } else if (statusFilter === 'expiring_soon') {
    // Akan expired dalam 7 hari ke depan
    whereConditions.push(`c.subscribe_list IS NOT NULL AND jsonb_array_length(c.subscribe_list) > 0 AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(c.subscribe_list) AS sub,
           jsonb_array_elements(sub->'product_list') AS prod
      WHERE (prod->>'expired_at')::timestamp >= CURRENT_TIMESTAMP
        AND (prod->>'expired_at')::timestamp < CURRENT_TIMESTAMP + INTERVAL '7 days'
    )`);
  }

  // Handle appFilter (specific application) - only if status allows subscriptions
  if (appFilter !== 'all' && statusFilter !== 'without_apps') {
    // Filter by specific application name
    whereConditions.push(`c.subscribe_list IS NOT NULL AND jsonb_array_length(c.subscribe_list) > 0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.subscribe_list) AS sub, jsonb_array_elements(sub->'product_list') AS prod WHERE prod->>'product_name' = $${paramIndex})`);
    params.push(appFilter);
    paramIndex += 1;
  }

  // Handle churnFilter
  if (churnFilter === 'aktif') {
    whereConditions.push(`EXISTS (
      SELECT 1
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
        AND cmt_debit.created_at >= NOW() - INTERVAL '7 days'
    )`);
  } else if (churnFilter === 'idle') {
    whereConditions.push(`EXISTS (
      SELECT 1
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
    ) AND (
      SELECT MAX(cmt_debit.created_at)
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
    ) < NOW() - INTERVAL '7 days' AND (
      SELECT MAX(cmt_debit.created_at)
      FROM credit_manager_transactions cmt_debit
      WHERE cmt_debit.user_id = c.guid::uuid
        AND LOWER(cmt_debit.type) = 'debit'
    ) >= NOW() - INTERVAL '30 days'`);
  } else if (churnFilter === 'pasif') {
    whereConditions.push(`(
      NOT EXISTS (
        SELECT 1
        FROM credit_manager_transactions cmt_debit
        WHERE cmt_debit.user_id = c.guid::uuid
          AND LOWER(cmt_debit.type) = 'debit'
      )
      OR (
        SELECT MAX(cmt_debit.created_at)
        FROM credit_manager_transactions cmt_debit
        WHERE cmt_debit.user_id = c.guid::uuid
          AND LOWER(cmt_debit.type) = 'debit'
      ) < NOW() - INTERVAL '30 days'
    )`);
  }

  const whereClauseBase = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const demoFilter = whereConditions.length > 0 ? ' AND dee.email IS NULL' : ' WHERE dee.email IS NULL';

  const countQuery = `
    SELECT COUNT(*) as count
    FROM cms_customers c
    LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
    ${whereClauseBase}${demoFilter}
  `;

  const result = await pool.query(countQuery, params);
  return parseInt(result.rows[0].count);
}

export async function getCustomerStats(): Promise<{
  total_users: number;
  users_with_credit: number;
  users_with_debit: number;
}> {
  if (!process.env.DATABASE_URL) {
    return { total_users: 0, users_with_credit: 0, users_with_debit: 0 };
  }

  const [totalResult, creditResult, debitResult] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM cms_customers'),
    pool.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM credit_manager_transactions
      WHERE LOWER(type) = 'credit'
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM credit_manager_transactions
      WHERE LOWER(type) = 'debit'
    `)
  ]);

  return {
    total_users: parseInt(totalResult.rows[0].count),
    users_with_credit: parseInt(creditResult.rows[0].count),
    users_with_debit: parseInt(debitResult.rows[0].count)
  };
}

export async function getCustomerById(id: string): Promise<CmsCustomer | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  const trimmed = id.trim();
  const result = await pool.query<CmsCustomerRow>(
    `
    SELECT c.guid,
           username,
           full_name,
           email,
           phone_number,
           city,
           country,
           status,
           is_active,
           is_email_verified,
           is_phone_number_verified,
           referal_code,
           created_at,
            updated_at,
           gender,
           birth_date,
           identity_number,
           identity_img,
           country_id,
           city_id,
           is_identity_verified,
           bank_name,
           bank_account_number,
           bank_owner_name,
           corporate_name,
           industry_name,
           employee_qty,
           solution_corporate_needs,
           is_free_trial_use,
           created_by_guid,
           created_by_name,
           updated_by_guid,
           updated_by_name,
           subscribe_list,
           COALESCE((
             SELECT SUM(amount)::numeric
             FROM credit_manager_transactions cmt
             WHERE cmt.user_id = c.guid::uuid AND LOWER(cmt.type) = 'credit'
           ), 0) AS credit_added,
           COALESCE((
             SELECT SUM(amount)::numeric
             FROM credit_manager_transactions cmt
             WHERE cmt.user_id = c.guid::uuid AND LOWER(cmt.type) = 'debit'
           ), 0) AS credit_used,
           COALESCE((
             SELECT array_agg(DISTINCT cmt.product_name ORDER BY cmt.product_name)
             FROM credit_manager_transactions cmt
             WHERE cmt.user_id = c.guid::uuid
               AND cmt.product_name IS NOT NULL
           ), ARRAY[]::text[]) AS applications,
          (
            SELECT json_agg(app ORDER BY app.product_name)
            FROM (
              SELECT cmt.product_name AS product_name,
                     COALESCE(SUM(CASE WHEN LOWER(cmt.type) = 'credit' THEN cmt.amount ELSE 0 END), 0) AS credit_added,
                     COALESCE(SUM(CASE WHEN LOWER(cmt.type) = 'debit' THEN cmt.amount ELSE 0 END), 0) AS credit_used,
                      (
                        SELECT ARRAY(
                          SELECT json_build_object('date', t.created_at, 'amount', t.amount)
                          FROM credit_manager_transactions t
                          WHERE t.user_id = c.guid::uuid
                            AND t.product_name = cmt.product_name
                            AND LOWER(t.type) = 'credit'
                          ORDER BY t.created_at
                        )
                      ) AS credit_events,
                      (
                        SELECT ARRAY(
                          SELECT json_build_object('date', t.created_at, 'amount', t.amount)
                          FROM credit_manager_transactions t
                          WHERE t.user_id = c.guid::uuid
                            AND t.product_name = cmt.product_name
                            AND LOWER(t.type) = 'debit'
                          ORDER BY t.created_at
                        )
                      ) AS debit_events
              FROM credit_manager_transactions cmt
              WHERE cmt.user_id = c.guid::uuid
                AND cmt.product_name IS NOT NULL
              GROUP BY cmt.product_name
            ) app
           ) AS app_credits
          ,
           (
             SELECT json_agg(DISTINCT jsonb_build_object(
               'nama', td.nama,
               'jenis_usaha', td.jenis_usaha,
               'no_hp', td.no_hp,
               'nama_training', COALESCE(ev.name, td.nama_training, te.event_id::text),
               'model_training', COALESCE(ev.model, td.model_training),
               'partner', COALESCE(ev.partner, td.partner),
               'tanggal_input_data', td.tanggal_input_data,
               'tanggal_input_trial', td.tanggal_input_trial,
               'akun_aktif_expired', td.akun_aktif_expired,
               'username_trial', td.username_trial,
               'klasifikasi', td.klasifikasi,
               'total_credit_tx', td.total_credit_tx,
               'total_debit_tx', td.total_debit_tx,
               'total_credits', td.total_credits,
               'total_debits', td.total_debits,
               'latest_balance', td.latest_balance,
               'credit_usage', td.credit_usage,
               'sudah_membeli_credit', td.sudah_membeli_credit,
               'event_date', ev.event_date,
             'event_id', te.event_id,
             'created_at', te.created_at
           )) FILTER (WHERE EXISTS (
               SELECT 1 FROM training_enrollments te2 WHERE LOWER(te2.user_guid::text) = LOWER(c.guid::text)
             ))
             FROM training_enrollments te
             LEFT JOIN training_events ev ON ev.id = te.event_id
            LEFT JOIN tmp_training_data td
             ON td.guid = te.source_guid
             WHERE LOWER(te.user_guid::text) = LOWER(c.guid::text)
           ) AS training_data
    FROM cms_customers c
    LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
    WHERE (c.guid = $1
       OR c.guid = LOWER($1)
       OR c.email = $1
       OR c.email ILIKE $2
       OR c.username = $1)
       AND dee.email IS NULL
  `,
    [trimmed, trimmed],
  );
  if (!result.rowCount) return null;
  return mapCustomer(result.rows[0]);
}

export async function upsertCustomer(customer: {
  guid: string;
  username?: string;
  full_name?: string;
  gender?: string;
  birth_date?: string;
  identity_number?: string;
  identity_img?: string;
  country_id?: number;
  country?: string;
  city_id?: number;
  city?: string;
  is_identity_verified?: boolean;
  bank_name?: string;
  bank_account_number?: string;
  bank_owner_name?: string;
  phone_number?: string;
  is_phone_number_verified?: boolean;
  email?: string;
  is_email_verified?: boolean;
  corporate_name?: string;
  industry_name?: string;
  employee_qty?: number;
  solution_corporate_needs?: string;
  referal_code?: string;
  is_free_trial_use?: boolean;
  status?: string;
  created_at?: string;
  created_by_guid?: string;
  created_by_name?: string;
  updated_at?: string;
  updated_by_guid?: string;
  updated_by_name?: string;
  subscribe_list?: unknown;
}): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const query = `
    INSERT INTO cms_customers (
      guid, username, full_name, gender, birth_date, identity_number, identity_img,
      country_id, country, city_id, city, is_identity_verified, bank_name,
      bank_account_number, bank_owner_name, phone_number, is_phone_number_verified,
      email, is_email_verified, corporate_name, industry_name, employee_qty,
      solution_corporate_needs, referal_code, is_free_trial_use, status,
      created_at, created_by_guid, created_by_name, updated_at,
      updated_by_guid, updated_by_name, subscribe_list
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33::jsonb
    ) ON CONFLICT (guid) DO UPDATE SET
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      identity_number = EXCLUDED.identity_number,
      identity_img = EXCLUDED.identity_img,
      country_id = EXCLUDED.country_id,
      country = EXCLUDED.country,
      city_id = EXCLUDED.city_id,
      city = EXCLUDED.city,
      is_identity_verified = EXCLUDED.is_identity_verified,
      bank_name = EXCLUDED.bank_name,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_owner_name = EXCLUDED.bank_owner_name,
      phone_number = EXCLUDED.phone_number,
      is_phone_number_verified = EXCLUDED.is_phone_number_verified,
      email = EXCLUDED.email,
      is_email_verified = EXCLUDED.is_email_verified,
      corporate_name = EXCLUDED.corporate_name,
      industry_name = EXCLUDED.industry_name,
      employee_qty = EXCLUDED.employee_qty,
      solution_corporate_needs = EXCLUDED.solution_corporate_needs,
      referal_code = EXCLUDED.referal_code,
      is_free_trial_use = EXCLUDED.is_free_trial_use,
      status = EXCLUDED.status,
      created_at = EXCLUDED.created_at,
      created_by_guid = EXCLUDED.created_by_guid,
      created_by_name = EXCLUDED.created_by_name,
      updated_at = EXCLUDED.updated_at,
      updated_by_guid = EXCLUDED.updated_by_guid,
      updated_by_name = EXCLUDED.updated_by_name,
      subscribe_list = EXCLUDED.subscribe_list
  `;

  // Helper function to sanitize string values
  const sanitizeString = (value: string | undefined): string | null => {
    if (!value || value.trim() === "") return null;
    return value.trim();
  };

  const values = [
    customer.guid,
    sanitizeString(customer.username),
    sanitizeString(customer.full_name),
    sanitizeString(customer.gender),
    customer.birth_date || null,
    sanitizeString(customer.identity_number),
    sanitizeString(customer.identity_img),
    customer.country_id || null,
    sanitizeString(customer.country),
    customer.city_id || null,
    sanitizeString(customer.city),
    customer.is_identity_verified || false,
    sanitizeString(customer.bank_name),
    sanitizeString(customer.bank_account_number),
    sanitizeString(customer.bank_owner_name),
    sanitizeString(customer.phone_number),
    customer.is_phone_number_verified || false,
    sanitizeString(customer.email),
    customer.is_email_verified || false,
    sanitizeString(customer.corporate_name),
    sanitizeString(customer.industry_name),
    customer.employee_qty || null,
    sanitizeString(customer.solution_corporate_needs),
    sanitizeString(customer.referal_code),
    customer.is_free_trial_use || false,
    sanitizeString(customer.status),
    customer.created_at || null,
    sanitizeString(customer.created_by_guid),
    sanitizeString(customer.created_by_name),
    customer.updated_at || null,
    sanitizeString(customer.updated_by_guid),
    sanitizeString(customer.updated_by_name),
    customer.subscribe_list ? JSON.stringify(customer.subscribe_list) : null,
  ];

  console.log(`Executing upsert for customer ${customer.guid}`);

  try {
    const result = await pool.query(query, values);
    console.log(`Upsert result for ${customer.guid}: rowCount=${result.rowCount}, command=${result.command}`);
  } catch (error) {
    console.error(`Error upserting customer ${customer.guid}:`, {
      message: (error as Error).message,
      code: (error as any).code,
      detail: (error as any).detail,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

export async function getReferralPartners(): Promise<ReferralPartner[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }
  const result = await pool.query<ReferralPartner>(`
    SELECT partner, code
    FROM referral_partners
  `);
  return result.rows;
}

export async function getDailySummary(): Promise<{
  daily_new_users: Array<{ date: string; count: number; cumulative: number }>;
  daily_purchases: Array<{ date: string; count: number; cumulative: number }>;
  total_new_users_month: number;
  total_purchases_month: number;
}> {
  if (!process.env.DATABASE_URL) {
    return {
      daily_new_users: [],
      daily_purchases: [],
      total_new_users_month: 0,
      total_purchases_month: 0,
    };
  }

  // Query untuk new users per hari (cumulative dari awal bulan)
  const newUsersQuery = `
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at) ROWS UNBOUNDED PRECEDING) as cumulative
    FROM cms_customers
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      AND created_at <= CURRENT_DATE
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `;

  // Query untuk finished IDR purchases: monthly distinct users buyers YTD, cumulative
  const purchasesQuery = `
    WITH monthly_counts AS (
      SELECT
        DATE_TRUNC('month', t.created_at) as month,
        COUNT(DISTINCT t.customer_guid) as count
      FROM transactions t
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      WHERE LOWER(t.status) = 'finished'
        AND UPPER(t.valuta_code) = 'IDR'
        AND dee.email IS NULL
        AND t.created_at >= DATE_TRUNC('year', CURRENT_DATE)
        AND t.created_at <= CURRENT_DATE
      GROUP BY DATE_TRUNC('month', t.created_at)
    )
    SELECT month::date as date, count, SUM(count) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING)::int as cumulative
    FROM monthly_counts
    ORDER BY month
  `;


  const [newUsersResult, purchasesResult] = await Promise.all([
    pool.query(newUsersQuery),
    pool.query(purchasesQuery)
  ]);

  const daily_new_users = newUsersResult.rows.map(row => ({
    date: row.date,
    count: parseInt(row.count),
    cumulative: parseInt(row.cumulative)
  }));

  const daily_purchases = purchasesResult.rows.map(row => ({
    date: row.date,
    count: parseInt(row.count),
    cumulative: parseInt(row.cumulative)
  }));

  const total_new_users_month = daily_new_users.length > 0
    ? daily_new_users[daily_new_users.length - 1].cumulative
    : 0;

  const total_purchases_month = daily_purchases.length > 0
    ? daily_purchases[daily_purchases.length - 1].cumulative
    : 0;

  return {
    daily_new_users,
    daily_purchases,
    total_new_users_month,
    total_purchases_month
  };
}
