import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
// These are set automatically when you add the "Upstash Redis" (or
// "Vercel KV") integration to your Vercel project.
export const redis = Redis.fromEnv();

export const ROOM_TTL_SECONDS = 60 * 60 * 24 * 30; // rooms auto-expire after 30 days idle
export const MAX_MESSAGES = 300; // cap stored history per room
