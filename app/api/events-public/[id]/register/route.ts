import { NextRequest, NextResponse } from "next/server";
import { getPublicEventById } from "@/lib/events";
import { 
  checkRegistration, 
  createRegistration, 
  checkCustomerByEmail, 
  createCustomer 
} from "@/lib/eventRegistrations";

// POST /api/events-public/[id]/register - Register for an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.full_name || !body.phone_number || !body.email) {
      return NextResponse.json({ 
        error: "Nama Lengkap, No. HandPhone, dan Email wajib diisi" 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    // Validate phone number format (Indonesia)
    const phoneRegex = /^08\d{8,11}$/;
    if (!phoneRegex.test(body.phone_number.replace(/[\s-]/g, ''))) {
      return NextResponse.json({ 
        error: "Format No. HandPhone tidak valid (contoh: 081234567890)" 
      }, { status: 400 });
    }

    // Check if event exists
    const event = await getPublicEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
    }

    // Check if registration is still open
    if (!event.is_registration_open) {
      return NextResponse.json({ error: "Pendaftaran event sudah ditutup" }, { status: 400 });
    }

    // Check if user is already registered
    const { is_registered } = await checkRegistration(id, body.email);
    if (is_registered) {
      return NextResponse.json({ 
        error: "Anda sudah terdaftar di event ini",
        is_already_registered: true
      }, { status: 409 });
    }

    // Check if customer exists in cms_customers
    const { exists: customerExists } = await checkCustomerByEmail(body.email);
    let isNewUser = false;

    if (!customerExists) {
      // Create new customer
      await createCustomer({
        full_name: body.full_name,
        email: body.email,
        phone_number: body.phone_number,
        corporate_name: body.business_name,
      });
      isNewUser = true;
    }

    // Create registration
    const registration = await createRegistration({
      event_id: id,
      full_name: body.full_name,
      phone_number: body.phone_number,
      email: body.email,
      business_name: body.business_name,
    });

    return NextResponse.json({
      registration,
      is_new_user: isNewUser,
      message: "Pendaftaran event berhasil!",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
