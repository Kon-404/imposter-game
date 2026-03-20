import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { selectImposters } from '@/lib/game-logic';
import { pickRandomWord } from '@/lib/words';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { playerId } = await request.json();

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

    if (room.host_id !== playerId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    // Get players
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id);

    if (!players || players.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 players to start' }, { status: 400 });
    }

    // Pick word and assign imposters
    const { word, hint, category } = pickRandomWord(room.categories);
    const imposterIds = selectImposters(
      players.map((p) => p.id),
      room.imposter_count,
    );

    // Reset all players and mark imposters
    for (const player of players) {
      await supabase
        .from('players')
        .update({
          is_imposter: imposterIds.includes(player.id),
          vote_for: null,
        })
        .eq('id', player.id);
    }

    // Build hint text based on hint_type
    let hintText: string | null = null;
    if (room.hint_type === 'category') {
      hintText = category;
    } else if (room.hint_type === 'word') {
      hintText = hint;
    }

    await supabase
      .from('rooms')
      .update({
        status: 'playing',
        word,
        hint_text: hintText,
      })
      .eq('id', room.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
