import { NextRequest, NextResponse } from "next/server";
import {
  getQuestionsByEvent,
  getDefaultQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/lib/eventQuestions";

// GET /api/events/questions?eventId=xxx - Get questions for an event
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (eventId) {
      const questions = await getQuestionsByEvent(eventId);
      return NextResponse.json({ questions });
    }

    const questions = await getDefaultQuestions();
    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/events/questions - Create new question
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.section || !body.question_text || !body.order_index) {
      return NextResponse.json(
        { error: "Section, question_text, and order_index are required" },
        { status: 400 }
      );
    }

    if (!body.options || body.options.length === 0) {
      return NextResponse.json(
        { error: "At least one option is required" },
        { status: 400 }
      );
    }

    const question = await createQuestion({
      event_id: body.event_id || null,
      section: body.section,
      section_order: body.section_order,
      order_index: body.order_index,
      question_text: body.question_text,
      question_type: body.question_type || "single_choice",
      options: body.options,
      is_required: body.is_required,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
