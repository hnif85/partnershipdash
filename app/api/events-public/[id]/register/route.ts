import { NextRequest, NextResponse } from "next/server";
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

// POST /api/events-public/[id]/register - Register for an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.full_name || !body.phone_number || !body.email) {
      return NextResponse.json({ 
        error: "Nama Lengkap, No. HandPhone, dan Email wajib diisi" 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    // Validate phone number format (Indonesia)
    const phoneRegex = /^08\d{8,11}$/;
    if (!phoneRegex.test(body.phone_number.replace(/[\s-]/g, ''))) {
      return NextResponse.json({ 
        error: "Format No. HandPhone tidak valid (contoh: 081234567890)" 
      }, { status: 400 });
    }

    // Check if event exists
    const event = await getPublicEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }

    // Check if registration is still open
    if (!event.is_registration_open) {
      return NextResponse.json({ error: "Pendaftaran event sudah ditutup" }, { status: 400 });
    }

    // Check if user is already registered
    const { is_registered } = await checkRegistration(id, body.email);
    if (is_registered) {
      return NextResponse.json({ 
        error: "Anda sudah terdaftar di event ini",
        is_already_registered: true
      }, { status: 409 });
    }

    // Check if customer exists in cms_customers
    const { exists: customerExists } = await checkCustomerByEmail(body.email);
    let isNewUser = false;

    if (!customerExists) {
      await createCustomer({
        full_name: body.full_name,
        email: body.email,
        phone_number: body.phone_number,
        corporate_name: body.business_name,
      });
      isNewUser = true;
    }

    // Create registration
    const registration = await createRegistration({
      event_id: id,
      full_name: body.full_name,
      phone_number: body.phone_number,
      email: body.email,
      business_name: body.business_name,
      city: body.city,
      business_since_year: body.business_since_year ? parseInt(body.business_since_year) : undefined,
      team_size: body.team_size ? parseInt(body.team_size) : undefined,
      business_line: body.business_line,
      monthly_net_profit: body.monthly_net_profit,
      has_separate_account: body.has_separate_account,
      brand_assets: body.brand_assets,
      profit_allocation: body.profit_allocation,
      main_focus: body.main_focus,
      subscription_consideration: body.subscription_consideration,
      whiz_solution_needed: body.whiz_solution_needed,
      referral_source: body.referral_source,
    });

    // Save questionnaire answers if provided
    let questionnaireAnswers = null;
    let scoringResult = null;
    if (body.questionnaire_answers && Array.isArray(body.questionnaire_answers)) {
      questionnaireAnswers = await saveAnswers(registration.id!, body.questionnaire_answers);

      // Calculate priority scoring
      const questions = await getQuestionsByEvent(id);
      const sectionMap = new Map(questions.map(q => [q.id, q]));

      const answersForScoring: QuestionAnswer[] = body.questionnaire_answers.map((ans: { question_id: string; answer_value: string }) => {
        const question = sectionMap.get(ans.question_id);
        return {
          question_id: ans.question_id,
          question_section: question?.section?.replace(/\s+/g, "_") || "",
          question_type: question?.question_type || "single_choice",
          answer_value: ans.answer_value,
          order_index: question?.order_index || 0,
        };
      });

      scoringResult = calculatePriority(answersForScoring);

      // Update registration with priority
      if (scoringResult.priority) {
        await updateRegistrationPriority(
          registration.id!,
          scoringResult.priority,
          scoringResult.percentage
        );
      }
    }

    return NextResponse.json({
      registration,
      is_new_user: isNewUser,
      message: "Pendaftaran event berhasil!",
      questionnaire_saved: questionnaireAnswers !== null,
      priority: scoringResult?.priority || null,
      priority_score: scoringResult?.percentage || null,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
