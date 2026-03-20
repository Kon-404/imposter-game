import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { playerName, playerId } = await request.json();

    if (!playerName || !playerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Find the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    // Check if player is already in the room
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .eq('room_id', room.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already in room' });
    }

    // Check player count (max 20)
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (count && count >= 20) {
      return NextResponse.json({ error: 'Room is full (max 20 players)' }, { status: 400 });
    }

    // Add the player
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        room_id: room.id,
        name: playerName,
      });

    if (playerError) {
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
