import { NextRequest, NextResponse } from "next/server";
import { getRoom, setTyping } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const { user, isTyping } = await req.json();

    if (!user) {
      return NextResponse.json(
        { error: "User is required." },
        { status: 400 }
      );
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    await setTyping(code, user, isTyping);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing error:", error);
    return NextResponse.json(
      { error: "Failed to update typing status." },
      { status: 500 }
    );
  }
}
