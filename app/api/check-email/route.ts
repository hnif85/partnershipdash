import { NextRequest, NextResponse } from "next/server";
import { checkCustomerByEmail, checkRegistration } from "@/lib/eventRegistrations";
import { pool } from "@/lib/database";
import { sanitizeEmail, checkRateLimit, getRateLimitKey } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const eventId = searchParams.get("eventId");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    // Rate limit: 3 requests per IP per 10 seconds (strict to prevent enumeration)
    const rateLimitKey = getRateLimitKey(request, "check-email");
    const { allowed } = await checkRateLimit(rateLimitKey, 3, 10000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const normalizedEmail = sanitizeEmail(email);
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    const { exists: customerExists } = await checkCustomerByEmail(normalizedEmail);

    let existingRegistration = null;
    if (eventId) {
      const { is_registered, registration } = await checkRegistration(eventId, normalizedEmail);
      if (is_registered && registration) {
        existingRegistration = {
          id: registration.id,
          full_name: registration.full_name || "",
          phone_number: registration.phone_number || "",
          business_name: registration.business_name || "",
        };
      }
    }

    let hasQuestionnaireAnswers = false;
    if (customerExists) {
      const answersResult = await pool.query(
        `SELECT COUNT(*) as count FROM event_question_answers eqa
         JOIN event_registrations er ON eqa.registration_id = er.id
         WHERE er.email ILIKE $1`,
        [normalizedEmail]
      );
      hasQuestionnaireAnswers = parseInt(answersResult.rows[0]?.count || 0) > 0;
    }

    return NextResponse.json({
      exists_in_customers: customerExists,
      already_registered: existingRegistration !== null,
      existing_registration: existingRegistration,
      has_questionnaire_answers: hasQuestionnaireAnswers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
