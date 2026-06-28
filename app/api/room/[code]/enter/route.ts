export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { hashPassword, newSessionToken, verifyPassword } from "@/lib/auth";
import { getRoom, saveRoom } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
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

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "That room code doesn't exist." },
        { status: 404 }
      );
    }

    const trimmedName = name.trim().slice(0, 24);
    const existing = room.participants.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      const ok = await verifyPassword(password, existing.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { error: "Wrong password for that name." },
          { status: 401 }
        );
      }
      const sessionToken = newSessionToken();
      existing.sessionToken = sessionToken;
      await saveRoom(room);
      return NextResponse.json({
        code,
        slot: existing.slot,
        sessionToken,
        name: existing.name,
      });
    }

    if (room.participants.length >= 2) {
      return NextResponse.json(
        {
          error:
            "This room already has two people in it. Ask whoever made it for a new room.",
        },
        { status: 403 }
      );
    }

    const usedSlots = room.participants.map((p) => p.slot);
    const slot = usedSlots.includes(1) ? 2 : 1;
    const passwordHash = await hashPassword(password);
    const sessionToken = newSessionToken();

    room.participants.push({
      slot: slot as 1 | 2,
      name: trimmedName,
      passwordHash,
      sessionToken,
      lastReadTs: 0,
    });
    await saveRoom(room);

    return NextResponse.json({ code, slot, sessionToken, name: trimmedName });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not enter room." }, { status: 500 });
  }
}
