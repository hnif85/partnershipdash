import { NextRequest, NextResponse } from "next/server";
import { getPublicEvents, getPublicEventById } from "@/lib/events";

// GET /api/events-public - Get public event list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get('upcoming') !== 'false';
    const eventId = searchParams.get('event_id');

    // If event_id is provided, return single event
    if (eventId) {
      const event = await getPublicEventById(eventId);
      if (!event) {
        return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ event });
    }

    const events = await getPublicEvents(upcoming);

    return NextResponse.json({
      events,
      total_count: events.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
