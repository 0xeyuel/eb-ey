import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, newSessionToken } from "@/lib/auth";
import { getRoom, saveRoom } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const { password } = await req.json();

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.participants.length >= 2) {
      return NextResponse.json(
        { error: "Room is already full." },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(password, room.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const sessionToken = newSessionToken(code);
    room.participants.push(sessionToken);
    room.updatedAt = Date.now();
    await saveRoom(code, room);

    return NextResponse.json({ sessionToken });
  } catch (error) {
    console.error("Enter room error:", error);
    return NextResponse.json(
      { error: "Failed to enter room." },
      { status: 500 }
    );
  }
}
