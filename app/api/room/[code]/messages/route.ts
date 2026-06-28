import { NextRequest, NextResponse } from "next/server";
import { appendMessage, clearMessages, getMessages } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const messages = await getMessages(code);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to get messages." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const { sender, text } = await req.json();

    if (!sender || !text) {
      return NextResponse.json(
        { error: "Sender and text are required." },
        { status: 400 }
      );
    }

    const message = await appendMessage(code, sender, text);
    return NextResponse.json(message);
  } catch (error) {
    console.error("Post message error:", error);
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    await clearMessages(code);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear messages error:", error);
    return NextResponse.json(
      { error: "Failed to clear messages." },
      { status: 500 }
    );
  }
}
