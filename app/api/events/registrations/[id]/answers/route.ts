import { NextRequest, NextResponse } from "next/server";
import {
  getAnswersByRegistration,
  saveAnswers,
} from "@/lib/eventQuestions";

// GET /api/events/registrations/[id]/answers - Get answers for a registration
// POST /api/events/registrations/[id]/answers - Save answers for a registration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const answers = await getAnswersByRegistration(id);
    return NextResponse.json({ answers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.answers || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { error: "Answers array is required" },
        { status: 400 }
      );
    }

    const savedAnswers = await saveAnswers(id, body.answers);

    return NextResponse.json({
      success: true,
      answers: savedAnswers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
