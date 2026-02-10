import { NextRequest, NextResponse } from "next/server";
import { getEventById, updateEvent, deleteEvent } from "@/lib/events";

// GET /api/events/[id] - Get event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEventById(id);

    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }

    // Calculate is_registration_open
    const is_registration_open = !event.registration_deadline || 
      new Date(event.registration_deadline) >= new Date();

    return NextResponse.json({ 
      event: {
        ...event,
        is_registration_open,
      } 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/events/[id] - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate event_type
    if (body.event_type && !['online', 'offline'].includes(body.event_type)) {
      return NextResponse.json({ error: "Tipe event harus 'online' atau 'offline'" }, { status: 400 });
    }

    const event = await updateEvent(id, {
      name: body.name,
      event_date: body.event_date,
      id_partner: body.id_partner,
      partner: body.partner,
      location: body.location,
      event_type: body.event_type,
      description: body.description,
      max_participants: body.max_participants ? parseInt(body.max_participants) : undefined,
      registration_deadline: body.registration_deadline,
      is_active: body.is_active,
    });

    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      event,
      message: "Event berhasil diupdate",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteEvent(id);

    if (!success) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Event berhasil dihapus" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
