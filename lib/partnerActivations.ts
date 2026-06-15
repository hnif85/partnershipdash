import { Pool } from "pg";
import fs from "fs";
import path from "path";

export type PartnerActivationRow = {
  partner: string;
  isGov: boolean;
  totalTrainings: number;
  uniqueUsers: number;
  totalParticipants: number;
  registeredUsers: number;
  appUsers: number;
};

export type PartnerCRMRow = {
  id?: number;
  no: number;
  partner: string;
  tipe: string;
  kontak: string;
  picMw: string;
  status: string;
  nextToDo: string;
  notes?: string;
  progressPercentage?: number;
  priority?: string;
  lastContactDate?: string;
  expectedCompletionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

type RawPartnerActivationRow = {
  partner: string | null;
  isGov: boolean | null;
  totalTrainings: number | string | null;
  uniqueUsers: number | string | null;
  totalParticipants: number | string | null;
  registeredUsers: number | string | null;
  appUsers: number | string | null;
};

export async function getPartnerActivationMatrix(): Promise<PartnerActivationRow[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<RawPartnerActivationRow>(`
    WITH partner_users AS (
      SELECT
        COALESCE(rp.partner, 'Tidak diketahui') AS partner,
        COALESCE(rp.is_gov, false) AS is_gov,
        rp.code AS partner_code,
        c.guid AS user_guid
      FROM cms_customers c
      LEFT JOIN referral_partners rp ON c.referal_code = rp.code
      WHERE c.referal_code IS NOT NULL
    ),
    partner_enrollments AS (
      SELECT
        pu.partner,
        pu.is_gov,
        pu.user_guid,
        te.event_id
      FROM partner_users pu
      LEFT JOIN training_enrollments te
        ON LOWER(te.user_guid::text) = LOWER(pu.user_guid::text)
      LEFT JOIN training_events ev
        ON ev.id = te.event_id
        AND (ev.id_partner IS NULL OR ev.id_partner = pu.partner_code)
    )
    SELECT
      pe.partner,
      pe.is_gov AS "isGov",
      COUNT(DISTINCT pe.event_id) FILTER (WHERE pe.event_id IS NOT NULL) AS "totalTrainings",
      COUNT(DISTINCT pe.user_guid) AS "uniqueUsers",
      COUNT(pe.event_id) AS "totalParticipants",
      COUNT(DISTINCT pe.user_guid) AS "registeredUsers",
      COUNT(DISTINCT pe.user_guid) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM credit_manager_transactions cmt
          WHERE LOWER(cmt.user_id::text) = LOWER(pe.user_guid::text)
            AND LOWER(cmt.type) = 'debit'
        )
      ) AS "appUsers"
    FROM partner_enrollments pe
    GROUP BY pe.partner, pe.is_gov
    ORDER BY pe.is_gov DESC, pe.partner;
  `);

  return result.rows.map((row) => ({
    partner: row.partner || "Tidak diketahui",
    isGov: row.isGov ?? false,
    totalTrainings: Number(row.totalTrainings) || 0,
    uniqueUsers: Number(row.uniqueUsers) || 0,
    totalParticipants: Number(row.totalParticipants) || 0,
    registeredUsers: Number(row.registeredUsers) || 0,
    appUsers: Number(row.appUsers) || 0,
  }));
}

export async function getPartnerCRMData(): Promise<PartnerCRMRow[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<PartnerCRMRow>(`
    SELECT
      no,
      partner,
      tipe,
      kontak,
      pic_mw as "picMw",
      status,
      next_to_do as "nextToDo",
      notes,
      progress_percentage as "progressPercentage",
      priority,
      last_contact_date as "lastContactDate",
      expected_completion_date as "expectedCompletionDate",
      created_at as "createdAt",
      updated_at as "updatedAt",
      created_by as "createdBy",
      updated_by as "updatedBy"
    FROM partners
    ORDER BY no ASC
  `);

  return result.rows;
}

export async function getPartnerById(id: number): Promise<PartnerCRMRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<PartnerCRMRow>(`
    SELECT
      no,
      partner,
      tipe,
      kontak,
      pic_mw as "picMw",
      status,
      next_to_do as "nextToDo",
      notes,
      progress_percentage as "progressPercentage",
      priority,
      last_contact_date as "lastContactDate",
      expected_completion_date as "expectedCompletionDate",
      created_at as "createdAt",
      updated_at as "updatedAt",
      created_by as "createdBy",
      updated_by as "updatedBy"
    FROM partners
    WHERE id = $1
  `, [id]);

  return result.rows[0] || null;
}

export async function updatePartner(id: number, updates: Partial<PartnerCRMRow & {
  notes?: string;
  progressPercentage?: number;
  priority?: string;
  lastContactDate?: string;
  expectedCompletionDate?: string;
  updatedBy?: string;
}>): Promise<PartnerCRMRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      // Convert camelCase to snake_case for database columns
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${dbKey} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  if (fields.length === 0) return null;

  const query = `
    UPDATE partners
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING
      no,
      partner,
      tipe,
      kontak,
      pic_mw as "picMw",
      status,
      next_to_do as "nextToDo",
      notes,
      progress_percentage as "progressPercentage",
      priority,
      last_contact_date as "lastContactDate",
      expected_completion_date as "expectedCompletionDate",
      created_at as "createdAt",
      updated_at as "updatedAt",
      created_by as "createdBy",
      updated_by as "updatedBy"
  `;

  values.push(id);

  const result = await pool.query<PartnerCRMRow>(query, values);
  return result.rows[0] || null;
}

export async function createPartner(partner: Omit<PartnerCRMRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<PartnerCRMRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<PartnerCRMRow>(`
    INSERT INTO partners (
      no, partner, tipe, kontak, pic_mw, status, next_to_do,
      notes, progress_percentage, priority, last_contact_date,
      expected_completion_date, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING
      no,
      partner,
      tipe,
      kontak,
      pic_mw as "picMw",
      status,
      next_to_do as "nextToDo",
      notes,
      progress_percentage as "progressPercentage",
      priority,
      last_contact_date as "lastContactDate",
      expected_completion_date as "expectedCompletionDate",
      created_at as "createdAt",
      updated_at as "updatedAt",
      created_by as "createdBy",
      updated_by as "updatedBy"
  `, [
    partner.no,
    partner.partner,
    partner.tipe,
    partner.kontak,
    partner.picMw,
    partner.status,
    partner.nextToDo,
    null, // notes
    0, // progress_percentage
    'medium', // priority
    null, // last_contact_date
    null, // expected_completion_date
    null, // created_by
    null  // updated_by
  ]);

  return result.rows[0] || null;
}
