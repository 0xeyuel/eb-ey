import { NextRequest, NextResponse } from "next/server";
import { hashPassword, newSessionToken } from "@/lib/auth";
import { createRoomRecord, saveRoom } from "@/lib/store";
import type { Room } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }

    const code = await createRoomRecord();
    const passwordHash = await hashPassword(password);
    const sessionToken = newSessionToken();

    const room: Room = {
      code,
      createdAt: Date.now(),
      participants: [
        { slot: 1, name: name.trim().slice(0, 24), passwordHash, sessionToken, lastReadTs: 0 },
      ],
    };

    await saveRoom(room);

    return NextResponse.json({
      code,
      slot: 1,
      sessionToken,
      name: room.participants[0].name,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not create room." }, { status: 500 });
  }
}
