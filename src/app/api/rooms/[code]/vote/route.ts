import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { playerId, voteFor } = await request.json();

    if (!playerId || !voteFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    if (room.status !== 'voting') {
      return NextResponse.json({ error: 'Not in voting phase' }, { status: 400 });
    }

    // Cannot vote for yourself
    if (playerId === voteFor) {
      return NextResponse.json({ error: 'Cannot vote for yourself' }, { status: 400 });
    }

    // Update the player's vote
    const { error } = await supabase
      .from('players')
      .update({ vote_for: voteFor })
      .eq('id', playerId)
      .eq('room_id', room.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
    }

    // Check if all players have voted
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id);

    const allVoted = players?.every((p) => p.vote_for !== null);

    if (allVoted) {
      // Automatically move to results
      await supabase
        .from('rooms')
        .update({ status: 'results' })
        .eq('id', room.id);
    }

    return NextResponse.json({ success: true, allVoted });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
