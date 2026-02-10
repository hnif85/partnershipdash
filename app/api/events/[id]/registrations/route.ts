import { NextRequest, NextResponse } from "next/server";
import { getRegistrationsByEvent } from "@/lib/eventRegistrations";

// GET /api/events/[id]/registrations - Get all registrations for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrations = await getRegistrationsByEvent(id);

    return NextResponse.json({
      registrations,
      total_count: registrations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
