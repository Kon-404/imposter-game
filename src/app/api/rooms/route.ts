import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateRoomCode } from '@/lib/game-logic';

export async function POST(request: NextRequest) {
  try {
    const { hostName, playerId } = await request.json();

    if (!hostName || !playerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Generate a unique room code (retry if collision)
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    // Create the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: playerId,
        status: 'waiting',
        categories: ['Everyday Objects'],
        imposter_count: 1,
        imposter_hint: false,
      })
      .select()
      .single();

    if (roomError) {
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // Add the host as the first player
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        room_id: room.id,
        name: hostName,
      });

    if (playerError) {
      return NextResponse.json({ error: 'Failed to add host as player' }, { status: 500 });
    }

    return NextResponse.json({ code: room.code, roomId: room.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
