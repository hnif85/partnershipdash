import { NextRequest, NextResponse } from "next/server";
import { getEvents, getEventsCount, createEvent, getReferralPartners, TrainingEventRow } from "@/lib/events";

const fallbackError = (message: string) =>
  NextResponse.json({ error: message, events: [], partners: [], total_count: 0, page: 1, limit: 10, total_pages: 0 }, { status: 500 });

// GET /api/events - List events with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const partnerFilter = searchParams.get('partnerFilter') || 'all';
    const statusFilter = searchParams.get('statusFilter') || 'all';

    const [events, partners, totalCount] = await Promise.all([
      getEvents(page, limit, search, partnerFilter, statusFilter),
      getReferralPartners(),
      getEventsCount(search, partnerFilter, statusFilter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      events,
      partners,
      total_count: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return fallbackError(message);
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.event_date) {
      return NextResponse.json({ error: "Nama event dan tanggal event wajib diisi" }, { status: 400 });
    }

    // Validate event_type
    if (body.event_type && !['online', 'offline'].includes(body.event_type)) {
      return NextResponse.json({ error: "Tipe event harus 'online' atau 'offline'" }, { status: 400 });
    }

    const event = await createEvent({
      name: body.name,
      event_date: body.event_date,
      id_partner: body.id_partner,
      partner: body.partner,
      location: body.location,
      event_type: body.event_type,
      description: body.description,
      max_participants: body.max_participants ? parseInt(body.max_participants) : undefined,
      registration_deadline: body.registration_deadline,
      is_active: body.is_active !== false,
      created_by: body.created_by,
    });

    return NextResponse.json({
      event,
      message: "Event berhasil dibuat",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
