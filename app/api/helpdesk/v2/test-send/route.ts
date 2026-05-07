import { NextRequest, NextResponse } from "next/server";
import { sendDamcorpText } from "@/lib/damcorpWhatsapp";

export async function POST() {
  try {
    const result = await sendDamcorpText("6285556667777", "Test reply from AI");
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown" 
    }, { status: 500 });
  }
}