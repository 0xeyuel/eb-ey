export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/store';

export async function POST(request: Request) {
  try {
    console.log('=== ROOM CREATION STARTED ===');
    console.log('Redis URL exists:', !!process.env.UPSTASH_REDIS_REST_URL);
    console.log('Redis Token exists:', !!process.env.UPSTASH_REDIS_REST_TOKEN);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const room = await createRoom(body);
    console.log('Room created:', room);
    
    return NextResponse.json(room);
  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
