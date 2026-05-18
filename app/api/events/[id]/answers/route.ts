import { NextRequest, NextResponse } from "next/server";
import { getAnswersByEvent, getQuestionsByEvent } from "@/lib/eventQuestions";

// GET /api/events/[id]/answers - Get all answers for an event (for comparison)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [registrationsWithAnswers, questions] = await Promise.all([
      getAnswersByEvent(id),
      getQuestionsByEvent(id),
    ]);
    return NextResponse.json({ 
      registrations: registrationsWithAnswers,
      questions: questions.map((q) => ({
        id: q.id,
        section: q.section,
        section_order: q.section_order,
        order_index: q.order_index,
        question_text: q.question_text,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
