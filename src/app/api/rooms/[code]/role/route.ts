import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const playerId = request.nextUrl.searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get room
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'waiting') {
      return NextResponse.json({ error: 'Game has not started yet' }, { status: 400 });
    }

    // Get player
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('room_id', room.id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found in this room' }, { status: 404 });
    }

    if (player.is_imposter) {
      return NextResponse.json({
        role: 'imposter',
        hint: room.hint_text,
        hintType: room.hint_type,
      });
    } else {
      return NextResponse.json({
        role: 'player',
        word: room.word,
      });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
