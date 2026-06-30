import { NextRequest, NextResponse } from "next/server";
import { updateRegistrationStatus } from "@/lib/eventRegistrations";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { registrationId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["registered", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Status harus registered, confirmed, atau cancelled" }, { status: 400 });
    }

    const registration = await updateRegistrationStatus(registrationId, status);

    if (!registration) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ registration, message: "Status berhasil diperbarui" });
  } catch (error) {
    return authErrorResponse(error);
  }
}
