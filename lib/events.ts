import { pool } from "./database";

// Types
export type EventType = 'online' | 'offline';
export type EventStatus = 'registered' | 'confirmed' | 'cancelled' | 'attended';

export type TrainingEventRow = {
  id?: string;
  name?: string;
  event_date?: string;
  id_partner?: string;
  partner?: string;
  model?: string;
  location?: string;
  event_type?: EventType;
  description?: string;
  max_participants?: number;
  registration_deadline?: string;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type PublicEvent = {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: EventType;
  description: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  partner_name: string;
  is_registration_open: boolean;
};

export type Partner = {
  partner: string;
  code?: string;
  is_gov?: boolean;
};

// Helper function to map database row to event
function mapEvent(row: TrainingEventRow): TrainingEventRow {
  return {
    ...row,
    is_active: row.is_active ?? true,
    event_type: row.event_type || 'offline',
    max_participants: row.max_participants ?? undefined,
    registration_deadline: row.registration_deadline ?? undefined,
    description: row.description || '',
    location: row.location || '',
  };
}

// Get all events with pagination and filters (admin)
export async function getEvents(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  partnerFilter: string = 'all',
  statusFilter: string = 'all'
): Promise<TrainingEventRow[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const offset = (page - 1) * limit;
  let whereConditions: string[] = [];
  let params: any[] = [];
  let paramIndex = 1;

  // Search filter
  if (search) {
    whereConditions.push(`te.name ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  // Partner filter
  if (partnerFilter !== 'all' && partnerFilter) {
    whereConditions.push(`te.partner = $${paramIndex}`);
    params.push(partnerFilter);
    paramIndex += 1;
  }

  // Status filter
  if (statusFilter === 'active') {
    whereConditions.push(`te.is_active = true`);
  } else if (statusFilter === 'inactive') {
    whereConditions.push(`te.is_active = false`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      te.id,
      te.name,
      te.event_date,
      te.id_partner,
      te.partner,
      te.model,
      te.location,
      te.event_type,
      te.description,
      te.max_participants,
      te.registration_deadline,
      te.is_active,
      te.created_by,
      te.created_at,
      te.updated_at
    FROM training_events te
    ${whereClause}
    ORDER BY te.event_date DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await pool.query<TrainingEventRow>(query, params);
  return result.rows.map(mapEvent);
}

// Get events count
export async function getEventsCount(
  search: string = '',
  partnerFilter: string = 'all',
  statusFilter: string = 'all'
): Promise<number> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  let whereConditions: string[] = [];
  let params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`te.name ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  if (partnerFilter !== 'all' && partnerFilter) {
    whereConditions.push(`te.partner = $${paramIndex}`);
    params.push(partnerFilter);
    paramIndex += 1;
  }

  if (statusFilter === 'active') {
    whereConditions.push(`te.is_active = true`);
  } else if (statusFilter === 'inactive') {
    whereConditions.push(`te.is_active = false`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `SELECT COUNT(*) as count FROM training_events te ${whereClause}`;
  const result = await pool.query(query, params);
  return parseInt(result.rows[0].count);
}

// Get event by ID
export async function getEventById(id: string): Promise<TrainingEventRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<TrainingEventRow>(
    `SELECT 
      id,
      name,
      event_date,
      id_partner,
      partner,
      model,
      location,
      event_type,
      description,
      max_participants,
      registration_deadline,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM training_events 
    WHERE id = $1`,
    [id]
  );

  if (!result.rowCount) return null;
  return mapEvent(result.rows[0]);
}

// Create new event
export async function createEvent(event: {
  name: string;
  event_date: string;
  id_partner?: string;
  partner?: string;
  location?: string;
  event_type?: EventType;
  description?: string;
  max_participants?: number;
  registration_deadline?: string;
  is_active?: boolean;
  created_by?: string;
}): Promise<TrainingEventRow> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<TrainingEventRow>(
    `INSERT INTO training_events (
      name, event_date, id_partner, partner, location, event_type,
      description, max_participants, registration_deadline, is_active, created_by, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING *`,
    [
      event.name,
      event.event_date,
      event.id_partner || null,
      event.partner || null,
      event.location || '',
      event.event_type || 'offline',
      event.description || '',
      event.max_participants || null,
      event.registration_deadline || null,
      event.is_active !== false,
      event.created_by || null,
    ]
  );

  return mapEvent(result.rows[0]);
}

// Update event
export async function updateEvent(
  id: string,
  event: Partial<{
    name: string;
    event_date: string;
    id_partner: string;
    partner: string;
    location: string;
    event_type: EventType;
    description: string;
    max_participants: number;
    registration_deadline: string;
    is_active: boolean;
  }>
): Promise<TrainingEventRow | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (event.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(event.name);
    paramIndex++;
  }
  if (event.event_date !== undefined) {
    updates.push(`event_date = $${paramIndex}`);
    params.push(event.event_date);
    paramIndex++;
  }
  if (event.id_partner !== undefined) {
    updates.push(`id_partner = $${paramIndex}`);
    params.push(event.id_partner);
    paramIndex++;
  }
  if (event.partner !== undefined) {
    updates.push(`partner = $${paramIndex}`);
    params.push(event.partner);
    paramIndex++;
  }
  if (event.location !== undefined) {
    updates.push(`location = $${paramIndex}`);
    params.push(event.location);
    paramIndex++;
  }
  if (event.event_type !== undefined) {
    updates.push(`event_type = $${paramIndex}`);
    params.push(event.event_type);
    paramIndex++;
  }
  if (event.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(event.description);
    paramIndex++;
  }
  if (event.max_participants !== undefined) {
    updates.push(`max_participants = $${paramIndex}`);
    params.push(event.max_participants);
    paramIndex++;
  }
  if (event.registration_deadline !== undefined) {
    updates.push(`registration_deadline = $${paramIndex}`);
    params.push(event.registration_deadline);
    paramIndex++;
  }
  if (event.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(event.is_active);
    paramIndex++;
  }

  if (updates.length === 0) {
    return getEventById(id);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const query = `
    UPDATE training_events 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query<TrainingEventRow>(query, params);
  if (!result.rowCount) return null;
  return mapEvent(result.rows[0]);
}

// Delete event
export async function deleteEvent(id: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `DELETE FROM training_events WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// Get referral partners for dropdown
export async function getReferralPartners(): Promise<Partner[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query<Partner>(
    `SELECT DISTINCT partner, code, is_gov
     FROM referral_partners
     WHERE partner IS NOT NULL
     ORDER BY partner ASC`
  );
  return result.rows;
}

// Get public events (upcoming only, is_active = true)
export async function getPublicEvents(upcoming: boolean = true): Promise<PublicEvent[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  let whereConditions = [`te.is_active = true`];
  
  if (upcoming) {
    whereConditions.push(`te.event_date >= CURRENT_DATE`);
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const query = `
    SELECT 
      te.id,
      te.name,
      te.event_date,
      COALESCE(te.location, '') as location,
      COALESCE(te.event_type, 'offline') as event_type,
      COALESCE(te.description, '') as description,
      te.registration_deadline,
      te.max_participants,
      COALESCE(te.partner, '') as partner,
      COUNT(er.id)::int as current_participants,
      CASE 
        WHEN te.registration_deadline IS NULL THEN true
        WHEN te.registration_deadline >= CURRENT_DATE THEN true
        ELSE false
      END as is_registration_open
    FROM training_events te
    LEFT JOIN event_registrations er ON er.event_id = te.id
    ${whereClause}
    GROUP BY te.id
    ORDER BY te.event_date ASC
  `;

  const result = await pool.query(query);
  return result.rows;
}

// Get public event by ID
export async function getPublicEventById(id: string): Promise<PublicEvent | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const query = `
    SELECT 
      te.id,
      te.name,
      te.event_date,
      COALESCE(te.location, '') as location,
      COALESCE(te.event_type, 'offline') as event_type,
      COALESCE(te.description, '') as description,
      te.registration_deadline,
      te.max_participants,
      COALESCE(te.partner, '') as partner,
      COUNT(er.id)::int as current_participants,
      CASE 
        WHEN te.registration_deadline IS NULL THEN true
        WHEN te.registration_deadline >= CURRENT_DATE THEN true
        ELSE false
      END as is_registration_open
    FROM training_events te
    LEFT JOIN event_registrations er ON er.event_id = te.id
    WHERE te.id = $1 AND te.is_active = true
    GROUP BY te.id
  `;

  const result = await pool.query(query, [id]);
  if (!result.rowCount) return null;
  return result.rows[0];
}

// Get related events (same partner)
export async function getRelatedEvents(eventId: string, limit: number = 3): Promise<PublicEvent[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const event = await getPublicEventById(eventId);
  if (!event) return [];

  const query = `
    SELECT 
      te.id,
      te.name,
      te.event_date,
      COALESCE(te.location, '') as location,
      COALESCE(te.event_type, 'offline') as event_type,
      COALESCE(te.description, '') as description,
      te.registration_deadline,
      te.max_participants,
      COALESCE(te.partner, '') as partner,
      COUNT(er.id)::int as current_participants,
      CASE 
        WHEN te.registration_deadline IS NULL THEN true
        WHEN te.registration_deadline >= CURRENT_DATE THEN true
        ELSE false
      END as is_registration_open
    FROM training_events te
    LEFT JOIN event_registrations er ON er.event_id = te.id
    WHERE te.id != $1 AND te.is_active = true
    GROUP BY te.id
    ORDER BY te.event_date ASC
    LIMIT $2
  `;

  const result = await pool.query(query, [eventId, limit]);
  return result.rows;
}
