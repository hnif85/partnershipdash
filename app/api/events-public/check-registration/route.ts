import { NextRequest, NextResponse } from "next/server";
import { checkRegistration } from "@/lib/eventRegistrations";

// GET /api/events-public/check-registration - Check if user is registered for an event
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const email = searchParams.get('email');
    const phoneNumber = searchParams.get('phone_number');

    if (!eventId) {
      return NextResponse.json({ error: "event_id wajib diisi" }, { status: 400 });
    }

    if (!email && !phoneNumber) {
      return NextResponse.json({ error: "email atau phone_number wajib diisi" }, { status: 400 });
    }

    const result = await checkRegistration(eventId, email || undefined, phoneNumber || undefined);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
