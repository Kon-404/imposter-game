import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { playerId } = await request.json();

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
      return NextResponse.json({ error: 'Only the host can start voting' }, { status: 403 });
    }

    if (room.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not in playing phase' }, { status: 400 });
    }

    await supabase
      .from('rooms')
      .update({ status: 'voting' })
      .eq('id', room.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
