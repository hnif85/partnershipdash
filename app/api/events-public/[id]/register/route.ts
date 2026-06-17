import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { getPublicEventById } from "@/lib/events";
import { 
  checkRegistration, 
  createRegistration, 
  checkCustomerByEmail, 
  createCustomer,
  updateRegistrationPriority 
} from "@/lib/eventRegistrations";
import { saveAnswers, getQuestionsByEvent } from "@/lib/eventQuestions";
import { calculatePriority, type QuestionAnswer } from "@/lib/eventScoring";
import {
  sanitizeText,
  sanitizePhone,
  sanitizeEmail,
  sanitizeBusinessName,
  sanitizeNotes,
  isValidQuestionnaireAnswer,
  checkRateLimit,
  getRateLimitKey,
  MAX_FIELD_LENGTHS,
} from "@/lib/security";

// POST /api/events-public/[id]/register - Register for an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limit: 5 registrations per IP per 60 seconds
    const rateLimitKey = getRateLimitKey(request, "register");
    const { allowed } = await checkRateLimit(rateLimitKey, 5, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Honeypot check - reject bots that fill hidden fields
    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json(
        { error: "Pendaftaran event berhasil!" },
        { status: 201 }
      );
    }

    // Validate required fields with length checks
    if (!body.full_name || typeof body.full_name !== "string" || !body.full_name.trim()) {
      return NextResponse.json({ 
        error: "Nama Lengkap wajib diisi" 
      }, { status: 400 });
    }
    if (!body.phone_number || typeof body.phone_number !== "string" || !body.phone_number.trim()) {
      return NextResponse.json({ 
        error: "No. HandPhone wajib diisi" 
      }, { status: 400 });
    }
    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json({ 
        error: "Email wajib diisi" 
      }, { status: 400 });
    }

    // Field length limits
    if (body.full_name.length > MAX_FIELD_LENGTHS.full_name) {
      return NextResponse.json({ error: "Nama terlalu panjang" }, { status: 400 });
    }
    if (body.phone_number.length > MAX_FIELD_LENGTHS.phone_number) {
      return NextResponse.json({ error: "No. HP terlalu panjang" }, { status: 400 });
    }
    if (body.email.length > MAX_FIELD_LENGTHS.email) {
      return NextResponse.json({ error: "Email terlalu panjang" }, { status: 400 });
    }
    if (body.business_name && body.business_name.length > MAX_FIELD_LENGTHS.business_name) {
      return NextResponse.json({ error: "Nama usaha terlalu panjang" }, { status: 400 });
    }

    // Sanitize and normalize inputs
    const email = sanitizeEmail(body.email);
    const fullName = sanitizeText(body.full_name, MAX_FIELD_LENGTHS.full_name);
    const phoneNumber = sanitizePhone(body.phone_number);
    const businessName = sanitizeBusinessName(body.business_name);

    // Validate email format (after sanitization)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    // Validate phone number format (Indonesia)
    const phoneRegex = /^08\d{8,11}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s-]/g, ""))) {
      return NextResponse.json({ 
        error: "Format No. HandPhone tidak valid (contoh: 081234567890)" 
      }, { status: 400 });
    }

    // Check for script injection remnants
    const scriptPattern = /<script|javascript:|on\w+=/i;
    if (scriptPattern.test(fullName) || scriptPattern.test(businessName)) {
      return NextResponse.json(
        { error: "Input mengandung karakter yang tidak diizinkan" },
        { status: 400 }
      );
    }

    // Check if event exists and registration is open
    const event = await getPublicEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }
    if (!event.is_registration_open) {
      return NextResponse.json({ error: "Pendaftaran event sudah ditutup" }, { status: 400 });
    }

    // Check if user is already registered
    const { is_registered } = await checkRegistration(id, email);
    if (is_registered) {
      return NextResponse.json({ 
        error: "Anda sudah terdaftar di event ini",
        is_already_registered: true
      }, { status: 409 });
    }

    // Transactional capacity check + registration
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check max_participants within transaction to prevent race conditions
      if (event.max_participants) {
        const countResult = await client.query(
          `SELECT COUNT(*)::int as count FROM event_registrations WHERE event_id = $1`,
          [id]
        );
        const currentCount = countResult.rows[0]?.count || 0;
        if (currentCount >= event.max_participants) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Event sudah penuh" },
            { status: 400 }
          );
        }
      }

      // Check if customer exists in cms_customers
      const { exists: customerExists } = await checkCustomerByEmail(email);
      let isNewUser = false;

      if (!customerExists) {
        await createCustomer({
          full_name: fullName,
          email,
          phone_number: phoneNumber,
          corporate_name: businessName,
        });
        isNewUser = true;
      }

      // Create registration
      const registration = await createRegistration({
        event_id: id,
        full_name: fullName,
        phone_number: phoneNumber,
        email,
        business_name: businessName,
        city: body.city ? sanitizeText(body.city, MAX_FIELD_LENGTHS.city) : undefined,
        business_since_year: body.business_since_year ? parseInt(body.business_since_year) : undefined,
        team_size: body.team_size ? parseInt(body.team_size) : undefined,
        business_line: body.business_line ? sanitizeText(body.business_line, MAX_FIELD_LENGTHS.business_line) : undefined,
        monthly_net_profit: body.monthly_net_profit ? sanitizeText(body.monthly_net_profit, 50) : undefined,
        has_separate_account: body.has_separate_account ? sanitizeText(body.has_separate_account, 50) : undefined,
        profit_allocation: body.profit_allocation ? sanitizeText(body.profit_allocation, 50) : undefined,
        main_focus: body.main_focus ? sanitizeText(body.main_focus, 50) : undefined,
        subscription_consideration: body.subscription_consideration ? sanitizeText(body.subscription_consideration, 50) : undefined,
        whiz_solution_needed: body.whiz_solution_needed ? sanitizeText(body.whiz_solution_needed, 50) : undefined,
        referral_source: body.referral_source ? sanitizeText(body.referral_source, 50) : undefined,
        notes: body.notes ? sanitizeNotes(body.notes) : undefined,
      });

      // Save questionnaire answers if provided
      let questionnaireAnswers = null;
      let scoringResult = null;
      if (body.questionnaire_answers && Array.isArray(body.questionnaire_answers)) {
        const questions = await getQuestionsByEvent(id);
        const validQuestionIds = new Set(questions.map((q) => q.id));

        const filteredAnswers = isValidQuestionnaireAnswer(
          body.questionnaire_answers,
          validQuestionIds
        );

        const sectionMap = new Map(questions.map((q) => [q.id, q]));

        const answersForScoring: QuestionAnswer[] = filteredAnswers.map(
          (ans: { question_id: string; answer_value: string }) => {
            const question = sectionMap.get(ans.question_id);
            return {
              question_id: ans.question_id,
              question_section: question?.section?.replace(/\s+/g, "_") || "",
              question_type: question?.question_type || "single_choice",
              answer_value: ans.answer_value,
              order_index: question?.order_index || 0,
            };
          }
        );

        if (filteredAnswers.length > 0) {
          questionnaireAnswers = await saveAnswers(registration.id!, filteredAnswers);
        }

        if (answersForScoring.length > 0) {
          scoringResult = calculatePriority(answersForScoring);

          if (scoringResult.priority) {
            await updateRegistrationPriority(
              registration.id!,
              scoringResult.priority,
              scoringResult.percentage
            );
          }
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        registration,
        is_new_user: isNewUser,
        message: "Pendaftaran event berhasil!",
        questionnaire_saved: questionnaireAnswers !== null,
        priority: scoringResult?.priority || null,
        priority_score: scoringResult?.percentage || null,
      }, { status: 201 });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
