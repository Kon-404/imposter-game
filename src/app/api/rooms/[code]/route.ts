import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get players
    const { data: players } = await supabase
      .from('players')
      .select('id, name, room_id, vote_for, joined_at')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true });

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        host_id: room.host_id,
        status: room.status,
        categories: room.categories,
        imposter_count: room.imposter_count,
        time_limit: room.time_limit,
        imposter_hint: room.imposter_hint,
        created_at: room.created_at,
      },
      players: players || [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { playerId, ...updates } = body;

    const supabase = createServiceClient();

    // Verify room exists and player is host
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== playerId) {
      return NextResponse.json({ error: 'Only the host can update settings' }, { status: 403 });
    }

    // Only allow updating certain fields
    const allowedUpdates: Record<string, unknown> = {};
    if (updates.categories) allowedUpdates.categories = updates.categories;
    if (updates.imposter_count !== undefined) allowedUpdates.imposter_count = updates.imposter_count;
    if (updates.time_limit !== undefined) allowedUpdates.time_limit = updates.time_limit;
    if (updates.imposter_hint !== undefined) allowedUpdates.imposter_hint = updates.imposter_hint;

    const { error } = await supabase
      .from('rooms')
      .update(allowedUpdates)
      .eq('id', room.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
