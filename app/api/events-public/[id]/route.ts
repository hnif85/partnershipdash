import { NextRequest, NextResponse } from "next/server";
import { getPublicEventById, getRelatedEvents } from "@/lib/events";

// GET /api/events-public/[id] - Get public event detail with related events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getPublicEventById(id);

    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }

    const relatedEvents = await getRelatedEvents(id);

    return NextResponse.json({
      event,
      related_events: relatedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
