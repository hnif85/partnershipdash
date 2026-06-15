import { NextRequest, NextResponse } from "next/server";
import { getPublicEventById } from "@/lib/events";
import { checkInToEvent } from "@/lib/attendance";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

// POST /api/events/[id]/attendance - Check-in to event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { id } = await params;
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { error: "Email wajib diisi" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Format email tidak valid" },
        { status: 400 }
      );
    }

    const event = await getPublicEventById(id);
    if (!event) {
      return NextResponse.json(
        { error: "Event tidak ditemukan" },
        { status: 404 }
      );
    }

    const { found, attendance } = await checkInToEvent(id, body.email);

    if (!found) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          message: attendance.message,
          event_name: event.name,
          registration_url: `/public-events/${id}/register`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      found: true,
      ...attendance,
      event_name: event.name,
      event_date: event.event_date,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// GET /api/events/[id]/attendance - Check attendance status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      );
    }

    const { found, attendance } = await checkInToEvent(id, email);

    return NextResponse.json({
      found,
      ...attendance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}