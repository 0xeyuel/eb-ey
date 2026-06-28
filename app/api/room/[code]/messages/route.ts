import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  appendMessage,
  clearMessages,
  getMessages,
  getRoom,
  isTyping,
  saveRoom,
} from "@/lib/store";
import type { Room } from "@/lib/types";

function authenticate(room: Room, token: string | null) {
  if (!token) return null;
  return room.participants.find((p) => p.sessionToken === token) ?? null;
}

export async function GET(
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
    const me = authenticate(room, token);
    if (!me) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const messages = await getMessages(code);

    // Mark everything currently in the thread as read by me.
    const latestTs = messages.reduce((max, m) => Math.max(max, m.ts), 0);
    if (latestTs > me.lastReadTs) {
      me.lastReadTs = latestTs;
      await saveRoom(room);
    }

    const partner = room.participants.find((p) => p.slot !== me.slot);
    const partnerTyping = partner ? await isTyping(code, partner.slot) : false;

    const participants = room.participants.map((p) => ({
      slot: p.slot,
      name: p.name,
      lastReadTs: p.lastReadTs,
    }));

    return NextResponse.json({ messages, participants, you: me.slot, partnerTyping });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const token = req.headers.get("x-session-token");
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Empty message." }, { status: 400 });
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    const me = authenticate(room, token);
    if (!me) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const ts = Date.now();
    await appendMessage(code, {
      id: nanoid(10),
      slot: me.slot,
      name: me.name,
      text: text.trim().slice(0, 2000),
      ts,
    });

    me.lastReadTs = ts;
    await saveRoom(room);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }
}

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
    const me = authenticate(room, token);
    if (!me) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await clearMessages(code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not clear chat." }, { status: 500 });
  }
}
