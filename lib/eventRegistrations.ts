import { pool } from "./database";
import { EventStatus } from "./events";

// Types
export type EventRegistrationRow = {
  id?: string;
  event_id?: string;
  full_name?: string;
  phone_number?: string;
  email?: string;
  business_name?: string;
  status?: EventStatus;
  registered_at?: string;
  confirmed_at?: string;
  notes?: string;
};

export type RegistrationWithEvent = {
  id: string;
  event_id: string;
  event_name?: string;
  event_date?: string;
  full_name: string;
  phone_number: string;
  email: string;
  business_name?: string;
  status: EventStatus;
  registered_at: string;
  confirmed_at?: string;
  notes?: string;
};

export type RegistrationWithCustomer = {
  id: string;
  event_id: string;
  event_name?: string;
  event_date?: string;
  full_name?: string;
  phone_number?: string;
  email?: string;
  business_name?: string;
  status?: EventStatus;
  registered_at?: string;
  confirmed_at?: string;
  notes?: string;
  customer_guid?: string;
};

// Helper function to map database row
function mapRegistration(row: EventRegistrationRow): EventRegistrationRow {
  return {
    ...row,
    status: row.status || 'registered',
    business_name: row.business_name || '',
    notes: row.notes || '',
  };
}

// Check if user is already registered for an event
export async function checkRegistration(
  eventId: string,
  email?: string,
  phoneNumber?: string
): Promise<{ is_registered: boolean; registration?: EventRegistrationRow }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  let query = `SELECT * FROM event_registrations WHERE event_id = $1`;
  const params: any[] = [eventId];
  let paramIndex = 2;

  if (email) {
    query += ` AND email ILIKE $${paramIndex}`;
    params.push(email);
    paramIndex++;
  }

  if (phoneNumber) {
    query += ` AND phone_number = $${paramIndex}`;
    params.push(phoneNumber);
  }

  query += ` LIMIT 1`;

  const result = await pool.query<EventRegistrationRow>(query, params);

  if (!result.rowCount) {
    return { is_registered: false };
  }

  return { is_registered: true, registration: mapRegistration(result.rows[0]) };
}

// Get registration by ID
export async function getRegistrationById(id: string): Promise<EventRegistrationRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<EventRegistrationRow>(
    `SELECT * FROM event_registrations WHERE id = $1`,
    [id]
  );

  if (!result.rowCount) return null;
  return mapRegistration(result.rows[0]);
}

// Get all registrations for an event
export async function getRegistrationsByEvent(
  eventId: string
): Promise<EventRegistrationRow[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<EventRegistrationRow>(
    `SELECT * FROM event_registrations 
     WHERE event_id = $1 
     ORDER BY registered_at DESC`,
    [eventId]
  );

  return result.rows.map(mapRegistration);
}

// Get registrations by email
export async function getRegistrationsByEmail(email: string): Promise<RegistrationWithEvent[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const query = `
    SELECT 
      er.id,
      er.event_id,
      te.name as event_name,
      te.event_date,
      er.full_name,
      er.phone_number,
      er.email,
      er.business_name,
      er.status,
      er.registered_at,
      er.confirmed_at,
      er.notes
    FROM event_registrations er
    JOIN training_events te ON te.id = er.event_id
    WHERE er.email ILIKE $1
    ORDER BY er.registered_at DESC
  `;

  const result = await pool.query(query, [email]);
  return result.rows;
}

// Create new registration
export async function createRegistration(registration: {
  event_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  business_name?: string;
  status?: EventStatus;
  notes?: string;
}): Promise<EventRegistrationRow> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<EventRegistrationRow>(
    `INSERT INTO event_registrations (
      event_id, full_name, phone_number, email, business_name, status, notes, registered_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`,
    [
      registration.event_id,
      registration.full_name,
      registration.phone_number,
      registration.email,
      registration.business_name || null,
      registration.status || 'registered',
      registration.notes || null,
    ]
  );

  return mapRegistration(result.rows[0]);
}

// Update registration status
export async function updateRegistrationStatus(
  id: string,
  status: EventStatus,
  confirmedAt?: string
): Promise<EventRegistrationRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  let query = `UPDATE event_registrations SET status = $1`;
  const params: any[] = [status];
  let paramIndex = 2;

  if (status === 'confirmed' || status === 'attended') {
    query += `, confirmed_at = $${paramIndex}`;
    params.push(confirmedAt || new Date().toISOString());
    paramIndex++;
  }

  query += ` WHERE id = $${paramIndex} RETURNING *`;
  params.push(id);

  const result = await pool.query<EventRegistrationRow>(query, params);
  if (!result.rowCount) return null;
  return mapRegistration(result.rows[0]);
}

// Update registration
export async function updateRegistration(
  id: string,
  updates: Partial<{
    full_name: string;
    phone_number: string;
    email: string;
    business_name: string;
    status: EventStatus;
    notes: string;
  }>
): Promise<EventRegistrationRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.full_name !== undefined) {
    setClauses.push(`full_name = $${paramIndex}`);
    params.push(updates.full_name);
    paramIndex++;
  }
  if (updates.phone_number !== undefined) {
    setClauses.push(`phone_number = $${paramIndex}`);
    params.push(updates.phone_number);
    paramIndex++;
  }
  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIndex}`);
    params.push(updates.email);
    paramIndex++;
  }
  if (updates.business_name !== undefined) {
    setClauses.push(`business_name = $${paramIndex}`);
    params.push(updates.business_name);
    paramIndex++;
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`);
    params.push(updates.status);
    paramIndex++;
  }
  if (updates.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex}`);
    params.push(updates.notes);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return getRegistrationById(id);
  }

  params.push(id);
  const query = `
    UPDATE event_registrations 
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query<EventRegistrationRow>(query, params);
  if (!result.rowCount) return null;
  return mapRegistration(result.rows[0]);
}

// Delete registration
export async function deleteRegistration(id: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `DELETE FROM event_registrations WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// Get registration count for an event
export async function getRegistrationCount(eventId: string): Promise<number> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `SELECT COUNT(*) as count FROM event_registrations WHERE event_id = $1`,
    [eventId]
  );
  return parseInt(result.rows[0].count);
}

// Check if customer exists by email
export async function checkCustomerByEmail(email: string): Promise<{ exists: boolean; guid?: string }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `SELECT guid FROM cms_customers WHERE email ILIKE $1 LIMIT 1`,
    [email]
  );

  if (!result.rowCount) {
    return { exists: false };
  }

  return { exists: true, guid: result.rows[0].guid };
}

// Create new customer (for new user registration)
export async function createCustomer(data: {
  full_name: string;
  email: string;
  phone_number: string;
  corporate_name?: string;
}): Promise<string> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Generate UUID using pg extension
  const result = await pool.query<{ guid: string }>(
    `SELECT uuid_generate_v4() as guid`
  );
  const guid = result.rows[0]?.guid;
  
  await pool.query(
    `INSERT INTO cms_customers (
      guid, full_name, email, phone_number, corporate_name, 
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [
      guid,
      data.full_name,
      data.email,
      data.phone_number,
      data.corporate_name || null,
    ]
  );

  return guid;
}

// ============================================
// LEAD MANAGEMENT FUNCTIONS
// ============================================

// Types for Lead
export type LeadRow = {
  id: number;
  nama_lengkap?: string;
  nomor_whatsapp?: string;
  email?: string;
  nama_usaha?: string;
  customer_guid?: string;
  kota_domisili?: string;
  kategori_usaha?: string;
  tantangan?: string;
  cerita_usaha?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  marketplace_url?: string;
  setuju_dihubungi?: boolean;
  created_at?: string;
  updated_at?: string;
};

// Check if lead exists by email
export async function checkLeadByEmail(email: string): Promise<{ exists: boolean; lead?: LeadRow }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<LeadRow>(
    `SELECT * FROM leads WHERE email ILIKE $1 LIMIT 1`,
    [email]
  );

  if (!result.rowCount) {
    return { exists: false };
  }

  return { exists: true, lead: result.rows[0] };
}

// Create new lead
export async function createLead(data: {
  full_name: string;
  phone_number: string;
  email: string;
  business_name?: string;
  city?: string;
  business_category?: string;
  challenges?: string;
  business_story?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  marketplace_url?: string;
  agree_to_be_contacted?: boolean;
}): Promise<LeadRow> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<LeadRow>(
    `INSERT INTO leads (
      nama_lengkap, nomor_whatsapp, email, nama_usaha, kota_domisili, kategori_usaha,
      tantangan, cerita_usaha, facebook_url, instagram_url, tiktok_url, marketplace_url,
      setuju_dihubungi, tanggal_daftar, inserted_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())
    RETURNING *`,
    [
      data.full_name,
      data.phone_number,
      data.email,
      data.business_name || null,
      data.city || null,
      data.business_category || null,
      data.challenges || null,
      data.business_story || null,
      data.facebook_url || null,
      data.instagram_url || null,
      data.tiktok_url || null,
      data.marketplace_url || null,
      data.agree_to_be_contacted !== undefined ? data.agree_to_be_contacted : true,
    ]
  );

  return result.rows[0];
}

// Update lead when they become a customer
export async function updateLeadCustomerGuid(
  leadId: number,
  customerGuid: string
): Promise<LeadRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<LeadRow>(
    `UPDATE leads 
     SET customer_guid = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [customerGuid, leadId]
  );

  return result.rowCount ? result.rows[0] : null;
}

// Link customer to existing lead by email
export async function linkCustomerToLead(
  email: string,
  customerGuid: string
): Promise<{ success: boolean; leadId?: number }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<{ id: number }>(
    `UPDATE leads 
     SET customer_guid = $1, updated_at = NOW()
     WHERE email ILIKE $2 AND customer_guid IS NULL
     RETURNING id`,
    [customerGuid, email]
  );

  if (result.rowCount && result.rows[0]) {
    return { success: true, leadId: result.rows[0].id };
  }

  return { success: false };
}

// Check if lead is already a customer
export async function isLeadCustomer(email: string): Promise<{
  is_customer: boolean;
  customer_guid?: string;
  lead_id?: number;
}> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Check in cms_customers first
  const customerResult = await pool.query<{ guid: string }>(
    `SELECT guid FROM cms_customers WHERE email ILIKE $1 LIMIT 1`,
    [email]
  );

  if (customerResult.rowCount) {
    return {
      is_customer: true,
      customer_guid: customerResult.rows[0].guid,
    };
  }

  // Check if lead exists with customer_guid
  const leadResult = await pool.query<{ id: number; customer_guid?: string }>(
    `SELECT id, customer_guid FROM leads WHERE email ILIKE $1 LIMIT 1`,
    [email]
  );

  if (leadResult.rowCount && leadResult.rows[0].customer_guid) {
    return {
      is_customer: true,
      customer_guid: leadResult.rows[0].customer_guid,
      lead_id: leadResult.rows[0].id,
    };
  }

  return { is_customer: false, lead_id: leadResult.rowCount ? leadResult.rows[0].id : undefined };
}

// ============================================
// REGISTRATION WITH LEAD/CUSTOMER INTEGRATION
// ============================================

// Complete registration flow - handles both customer and lead
export async function registerForEvent(data: {
  event_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  business_name?: string;
  city?: string;
  business_category?: string;
  challenges?: string;
  business_story?: string;
  notes?: string;
}): Promise<{
  registration: EventRegistrationRow;
  is_new_customer: boolean;
  is_new_lead: boolean;
  customer_guid?: string;
  lead_id?: number;
}> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Check if user is already a customer
  const { exists: customerExists, guid: existingCustomerGuid } = await checkCustomerByEmail(data.email);
  
  // Check if user is already a lead
  const { exists: leadExists, lead: existingLead } = await checkLeadByEmail(data.email);

  let customerGuid = existingCustomerGuid;
  let isNewCustomer = false;
  let leadId = existingLead?.id;
  let isNewLead = false;

  // Start transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    if (customerExists) {
      // User is already a customer
      customerGuid = existingCustomerGuid;
      
      // If they exist as a lead without customer_guid, link them
      if (leadExists && existingLead && !existingLead.customer_guid) {
        await client.query(
          `UPDATE leads SET customer_guid = $1, updated_at = NOW() WHERE id = $2`,
          [customerGuid, existingLead.id]
        );
        leadId = existingLead.id;
      }
    } else {
      // Check if there's a lead with customer_guid (lead converted elsewhere)
      if (leadExists && existingLead?.customer_guid) {
        customerGuid = existingLead.customer_guid;
        leadId = existingLead.id;
      } else {
        // Create new customer
        const customerResult = await client.query<{ guid: string }>(
          `SELECT uuid_generate_v4() as guid`
        );
        customerGuid = customerResult.rows[0].guid;
        
        await client.query(
          `INSERT INTO cms_customers (
            guid, full_name, email, phone_number, corporate_name, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            customerGuid,
            data.full_name,
            data.email,
            data.phone_number,
            data.business_name || null,
          ]
        );
        isNewCustomer = true;

        // Create or update lead
        if (leadExists && existingLead) {
          // Update existing lead with customer_guid
          await client.query(
            `UPDATE leads 
             SET customer_guid = $1, updated_at = NOW()
             WHERE id = $2`,
            [customerGuid, existingLead.id]
          );
          leadId = existingLead.id;
        } else {
          // Create new lead
          const leadResult = await client.query<{ id: number }>(
            `INSERT INTO leads (
              nama_lengkap, nomor_whatsapp, email, nama_usaha, kota_domisili, kategori_usaha,
              tantangan, cerita_usaha, customer_guid, setuju_dihubungi, tanggal_daftar, inserted_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW(), NOW())
            RETURNING id`,
            [
              data.full_name,
              data.phone_number,
              data.email,
              data.business_name || null,
              data.city || null,
              data.business_category || null,
              data.challenges || null,
              data.business_story || null,
              customerGuid,
            ]
          );
          leadId = leadResult.rows[0].id;
          isNewLead = true;
        }
      }
    }

    // Create registration
    const regResult = await client.query<EventRegistrationRow>(
      `INSERT INTO event_registrations (
        event_id, full_name, phone_number, email, business_name, status, notes, registered_at
      ) VALUES ($1, $2, $3, $4, $5, 'registered', $6, NOW())
      RETURNING *`,
      [
        data.event_id,
        data.full_name,
        data.phone_number,
        data.email,
        data.business_name || null,
        data.notes || null,
      ]
    );

    await client.query('COMMIT');

    return {
      registration: mapRegistration(regResult.rows[0]),
      is_new_customer: isNewCustomer,
      is_new_lead: isNewLead,
      customer_guid: customerGuid,
      lead_id: leadId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
