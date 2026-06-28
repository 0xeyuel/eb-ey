import { NextRequest, NextResponse } from "next/server";
import { hashPassword, newSessionToken } from "@/lib/auth";
import { createRoomRecord, saveRoom } from "@/lib/store";
import type { Room } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const room: Room = {
      code,
      name: name.trim(),
      password: await hashPassword(password),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      participants: [],
      messages: [],
      typing: {},
    };

    await saveRoom(code, room);
    return NextResponse.json({ code, sessionToken: newSessionToken(code) });
  } catch (error) {
    console.error("Room creation error:", error);
    return NextResponse.json(
      { error: "Failed to create room." },
      { status: 500 }
    );
  }
}
