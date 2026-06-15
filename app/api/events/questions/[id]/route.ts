import { NextRequest, NextResponse } from "next/server";
import {
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} from "@/lib/eventQuestions";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

// GET /api/events/questions/[id] - Get single question
// PUT /api/events/questions/[id] - Update question
// DELETE /api/events/questions/[id] - Delete question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await getQuestionById(id);

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { id } = await params;
    const body = await request.json();

    const question = await updateQuestion(id, {
      section: body.section,
      section_order: body.section_order,
      order_index: body.order_index,
      question_text: body.question_text,
      question_type: body.question_type,
      options: body.options,
      is_active: body.is_active,
      is_required: body.is_required,
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { id } = await params;
    const deleted = await deleteQuestion(id);

    if (!deleted) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
