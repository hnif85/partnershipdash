import { pool } from "./database";

export type EventQuestion = {
  id: string;
  event_id: string | null;
  section: string;
  section_order: number;
  order_index: number;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  options: string[];
  is_active: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionAnswer = {
  id: string;
  registration_id: string;
  question_id: string;
  answer_value: string | null;
  created_at: string;
};

export type QuestionWithAnswer = {
  id: string;
  section: string;
  section_order: number;
  order_index: number;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  options: string[];
  is_required: boolean;
  answer_value?: string | null;
  answer_id?: string;
};

export type RegistrationWithAnswers = {
  registration_id: string;
  full_name: string;
  email: string;
  business_name?: string;
  registered_at: string;
  status: string;
  answers: QuestionWithAnswer[];
};

function mapQuestion(row: any): EventQuestion {
  return {
    ...row,
    question_type: row.question_type || "single_choice",
    options: typeof row.options === "string" ? JSON.parse(row.options) : (row.options || []),
    is_active: row.is_active ?? true,
    is_required: row.is_required ?? true,
  };
}

export async function getQuestionsByEvent(eventId: string): Promise<EventQuestion[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `SELECT * FROM event_questions 
     WHERE is_active = TRUE 
       AND (event_id = $1 OR event_id IS NULL)
     ORDER BY section_order, order_index`,
    [eventId]
  );

  return result.rows.map(mapQuestion);
}

export async function getDefaultQuestions(): Promise<EventQuestion[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `SELECT * FROM event_questions 
     WHERE is_active = TRUE AND event_id IS NULL
     ORDER BY section_order, order_index`
  );

  return result.rows.map(mapQuestion);
}

export async function getQuestionById(id: string): Promise<EventQuestion | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `SELECT * FROM event_questions WHERE id = $1`,
    [id]
  );

  if (!result.rowCount) return null;
  return mapQuestion(result.rows[0]);
}

export async function createQuestion(data: {
  event_id?: string | null;
  section: string;
  section_order?: number;
  order_index: number;
  question_text: string;
  question_type?: "single_choice" | "multiple_choice";
  options: string[];
  is_required?: boolean;
}): Promise<EventQuestion> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `INSERT INTO event_questions (
      event_id, section, section_order, order_index, question_text, 
      question_type, options, is_required
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.event_id || null,
      data.section,
      data.section_order || 1,
      data.order_index,
      data.question_text,
      data.question_type || "single_choice",
      JSON.stringify(data.options),
      data.is_required ?? true,
    ]
  );

  return mapQuestion(result.rows[0]);
}

export async function updateQuestion(
  id: string,
  updates: Partial<{
    section: string;
    section_order: number;
    order_index: number;
    question_text: string;
    question_type: "single_choice" | "multiple_choice";
    options: string[];
    is_active: boolean;
    is_required: boolean;
  }>
): Promise<EventQuestion | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const setClauses: string[] = [`updated_at = NOW()`];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.section !== undefined) {
    setClauses.push(`section = $${paramIndex}`);
    params.push(updates.section);
    paramIndex++;
  }
  if (updates.section_order !== undefined) {
    setClauses.push(`section_order = $${paramIndex}`);
    params.push(updates.section_order);
    paramIndex++;
  }
  if (updates.order_index !== undefined) {
    setClauses.push(`order_index = $${paramIndex}`);
    params.push(updates.order_index);
    paramIndex++;
  }
  if (updates.question_text !== undefined) {
    setClauses.push(`question_text = $${paramIndex}`);
    params.push(updates.question_text);
    paramIndex++;
  }
  if (updates.question_type !== undefined) {
    setClauses.push(`question_type = $${paramIndex}`);
    params.push(updates.question_type);
    paramIndex++;
  }
  if (updates.options !== undefined) {
    setClauses.push(`options = $${paramIndex}`);
    params.push(JSON.stringify(updates.options));
    paramIndex++;
  }
  if (updates.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex}`);
    params.push(updates.is_active);
    paramIndex++;
  }
  if (updates.is_required !== undefined) {
    setClauses.push(`is_required = $${paramIndex}`);
    params.push(updates.is_required);
    paramIndex++;
  }

  params.push(id);
  const query = `
    UPDATE event_questions 
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, params);
  if (!result.rowCount) return null;
  return mapQuestion(result.rows[0]);
}

export async function deleteQuestion(id: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `DELETE FROM event_questions WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function saveAnswers(
  registrationId: string,
  answers: { question_id: string; answer_value: string }[]
): Promise<QuestionAnswer[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const results: QuestionAnswer[] = [];

    for (const answer of answers) {
      const result = await client.query(
        `INSERT INTO event_question_answers (registration_id, question_id, answer_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (registration_id, question_id) 
         DO UPDATE SET answer_value = $3
         RETURNING *`,
        [registrationId, answer.question_id, answer.answer_value]
      );
      results.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return results;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAnswersByRegistration(registrationId: string): Promise<QuestionWithAnswer[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `SELECT q.*, eqa.answer_value, eqa.id as answer_id
     FROM event_questions q
     LEFT JOIN event_question_answers eqa ON q.id = eqa.question_id AND eqa.registration_id = $1
     WHERE q.is_active = TRUE
       AND (q.event_id IS NULL OR q.event_id IN (
         SELECT event_id FROM event_registrations WHERE id = $1
       ))
     ORDER BY q.section_order, q.order_index`,
    [registrationId]
  );

  return result.rows.map(mapQuestion);
}

export async function getAnswersByEvent(eventId: string): Promise<RegistrationWithAnswers[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const registrationsResult = await pool.query(
    `SELECT id, full_name, email, business_name, registered_at, status
     FROM event_registrations
     WHERE event_id = $1
     ORDER BY registered_at DESC`,
    [eventId]
  );

  if (!registrationsResult.rowCount) return [];

  const registrations = registrationsResult.rows;
  const registrationIds = registrations.map((r) => r.id);

  if (registrationIds.length === 0) return [];

  const answersResult = await pool.query(
    `SELECT eqa.*, q.section, q.section_order, q.order_index, q.question_text, 
            q.question_type, q.options
     FROM event_question_answers eqa
     JOIN event_questions q ON eqa.question_id = q.id
     WHERE eqa.registration_id = ANY($1)
     ORDER BY q.section_order, q.order_index`,
    [registrationIds]
  );

  const answersByRegistration = new Map<string, QuestionWithAnswer[]>();
  for (const answer of answersResult.rows) {
    const mapped = mapQuestion(answer);
    const qa: QuestionWithAnswer = {
      id: mapped.id,
      section: mapped.section,
      section_order: mapped.section_order,
      order_index: mapped.order_index,
      question_text: mapped.question_text,
      question_type: mapped.question_type,
      options: mapped.options,
      is_required: mapped.is_required,
      answer_value: (answer as any).answer_value,
      answer_id: (answer as any).answer_id,
    };
    const existing = answersByRegistration.get(answer.registration_id) || [];
    existing.push(qa);
    answersByRegistration.set(answer.registration_id, existing);
  }

  return registrations.map((reg) => ({
    registration_id: reg.id,
    full_name: reg.full_name,
    email: reg.email,
    business_name: reg.business_name,
    registered_at: reg.registered_at,
    status: reg.status,
    answers: answersByRegistration.get(reg.id) || [],
  }));
}

export async function getSectionsWithQuestions(eventId: string): Promise<Map<string, EventQuestion[]>> {
  const questions = await getQuestionsByEvent(eventId);
  const sections = new Map<string, EventQuestion[]>();

  for (const question of questions) {
    const existing = sections.get(question.section) || [];
    existing.push(question);
    sections.set(question.section, existing);
  }

  return sections;
}
