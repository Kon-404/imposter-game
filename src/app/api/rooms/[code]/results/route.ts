import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getVoteResults } from '@/lib/game-logic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'results') {
      return NextResponse.json({ error: 'Results not available yet' }, { status: 400 });
    }

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id);

    if (!players) {
      return NextResponse.json({ error: 'No players found' }, { status: 404 });
    }

    const results = getVoteResults(players);

    return NextResponse.json({
      word: room.word,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        is_imposter: p.is_imposter,
        vote_for: p.vote_for,
      })),
      ...results,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST to start a new round or go back to lobby
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { playerId, action } = await request.json();

    const supabase = createServiceClient();

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== playerId) {
      return NextResponse.json({ error: 'Only the host can do this' }, { status: 403 });
    }

    if (action === 'lobby') {
      // Reset room to waiting
      await supabase
        .from('rooms')
        .update({ status: 'waiting', word: null, hint_text: null })
        .eq('id', room.id);

      // Reset player roles
      await supabase
        .from('players')
        .update({ is_imposter: false, vote_for: null })
        .eq('room_id', room.id);

      return NextResponse.json({ success: true, redirect: 'lobby' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
