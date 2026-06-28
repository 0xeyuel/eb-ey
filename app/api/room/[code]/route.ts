export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { deleteRoom, getRoom } from "@/lib/store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const token = req.headers.get("x-session-token");

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    const me = room.participants.find((p) => p.sessionToken === token);
    if (!me) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await deleteRoom(code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not end the room." }, { status: 500 });
  }
}
