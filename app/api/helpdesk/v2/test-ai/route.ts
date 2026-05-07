import { NextRequest, NextResponse } from "next/server";
import { generateAIReply, calculateLeadScore } from "@/lib/aiChat";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    const context = {
      currentIntent: undefined,
      flowName: undefined,
      currentStep: 0,
      collectedParams: {},
      lastBotMessage: undefined,
      turnCount: 0,
    };

    const result = await generateAIReply(message, context);
    
    return NextResponse.json({
      success: true,
      message,
      reply: result.reply,
      intent: result.intent,
      shouldEscalate: result.shouldEscalate,
      context: result.context,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}