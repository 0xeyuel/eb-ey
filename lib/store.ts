import { customAlphabet } from "nanoid";
import { redis, ROOM_TTL_SECONDS, MAX_MESSAGES } from "./redis";
import type { Room, ChatMessage } from "./types";

// No 0/O/1/I to avoid confusing room codes read aloud or typed on mobile.
const generateCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

const roomKey = (code: string) => `room:${code}`;
const messagesKey = (code: string) => `room:${code}:messages`;
const typingKey = (code: string, slot: number) => `room:${code}:typing:${slot}`;

const TYPING_TTL_SECONDS = 4;

export async function createRoomRecord(): Promise<string> {
  let code = generateCode();
  // Extremely unlikely collision, but guard anyway.
  for (let i = 0; i < 5; i++) {
    const existing = await redis.get(roomKey(code));
    if (!existing) break;
    code = generateCode();
  }
  return code;
}

export async function getRoom(code: string): Promise<Room | null> {
  const data = await redis.get<Room>(roomKey(code));
  return data ?? null;
}

export async function saveRoom(room: Room): Promise<void> {
  await redis.set(roomKey(room.code), room, { ex: ROOM_TTL_SECONDS });
}

export async function deleteRoom(code: string): Promise<void> {
  await redis.del(roomKey(code));
  await redis.del(messagesKey(code));
  await redis.del(typingKey(code, 1));
  await redis.del(typingKey(code, 2));
}

export async function appendMessage(
  code: string,
  message: ChatMessage
): Promise<void> {
  await redis.rpush(messagesKey(code), JSON.stringify(message));
  await redis.ltrim(messagesKey(code), -MAX_MESSAGES, -1);
  await redis.expire(messagesKey(code), ROOM_TTL_SECONDS);
}

export async function clearMessages(code: string): Promise<void> {
  await redis.del(messagesKey(code));
}

export async function getMessages(code: string): Promise<ChatMessage[]> {
  const raw = await redis.lrange(messagesKey(code), 0, -1);
  return raw.map((item) =>
    typeof item === "string" ? (JSON.parse(item) as ChatMessage) : (item as ChatMessage)
  );
}

export async function setTyping(code: string, slot: number): Promise<void> {
  await redis.set(typingKey(code, slot), "1", { ex: TYPING_TTL_SECONDS });
}

export async function isTyping(code: string, slot: number): Promise<boolean> {
  const v = await redis.get(typingKey(code, slot));
  return v !== null;
}
