'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/types';
import type { Room, Player } from '@/lib/types';

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const settingsChangedAt = useRef(0);

  const isHost = room?.host_id === playerId;

  // Full fetch — used only on initial load
  const fetchRoomFull = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    if (!res.ok) {
      setError('Room not found');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRoom(data.room);
    setPlayers(data.players);
    setLoading(false);
    if (data.room.status !== 'waiting') {
      router.push(`/game/${code}`);
    }
  }, [code, router]);

  // Light fetch — only updates players + status, preserves host settings
  const pollRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    if (!res.ok) return;
    const data = await res.json();
    setPlayers(data.players);
    if (data.room.status !== 'waiting') {
      router.push(`/game/${code}`);
    }
  }, [code, router]);

  useEffect(() => {
    const id = localStorage.getItem('imposter_player_id') || '';
    setPlayerId(id);
    fetchRoomFull();
  }, [fetchRoomFull]);

  // Store room ID in a ref so realtime effect doesn't re-run on every room update
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (room?.id) roomIdRef.current = room.id;
  }, [room?.id]);

  // Real-time subscriptions
  useEffect(() => {
    if (!room?.id) return;
    const currentRoomId = room.id;

    const sb = getSupabase();
    const roomChannel = sb
      .channel(`lobby-${currentRoomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoomId}` },
        (payload) => {
          const updated = payload.new as Room;
          // Only react to status changes — don't overwrite host's local settings
          if (updated.status !== 'waiting') {
            router.push(`/game/${code}`);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${currentRoomId}` },
        () => {
          pollRoom();
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(roomChannel);
    };
    // Only re-subscribe when room ID changes, not on every room state update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Polling fallback - only updates players + status
  useEffect(() => {
    const interval = setInterval(pollRoom, 3000);
    return () => clearInterval(interval);
  }, [pollRoom]);

  async function updateSettings(updates: Record<string, unknown>) {
    settingsChangedAt.current = Date.now();
    await fetch(`/api/rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, ...updates }),
    });
  }

  function toggleCategory(category: string) {
    if (!room) return;
    const current = room.categories || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    if (updated.length === 0) return; // Must have at least one
    setRoom({ ...room, categories: updated });
    updateSettings({ categories: updated });
  }

  async function startGame() {
    setStarting(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setStarting(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => router.push('/')} className="text-primary font-medium">
          Go Home
        </button>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${code}` : '';

  return (
    <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="text-center space-y-3 mb-6">
        <h1 className="text-2xl font-bold">Game Lobby</h1>
        <button
          onClick={copyCode}
          className="inline-flex items-center gap-2 bg-card border border-card-border rounded-2xl px-6 py-3 transition-all hover:bg-card-border"
        >
          <span className="text-3xl font-mono font-bold tracking-[0.2em]">{code}</span>
          <span className="text-xs text-muted">{copied ? 'Copied!' : 'Tap to copy'}</span>
        </button>
        <p className="text-sm text-muted">Share this code with friends to join</p>

        {/* Share URL (ready for WhatsApp integration) */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Join my Imposter game!', url: shareUrl });
            } else {
              navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }}
          className="text-sm text-primary font-medium hover:underline"
        >
          📤 Share invite link
        </button>
      </div>

      {/* Players */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✋</span>
          <h2 className="font-semibold text-sm uppercase text-muted">Players ({players.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-background border border-card-border rounded-xl px-3 py-1.5 text-sm flex items-center gap-1.5"
            >
              {player.id === room?.host_id && <span className="text-xs">👑</span>}
              <span>{player.name}</span>
              {player.id === playerId && (
                <span className="text-xs text-muted">(you)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings (host only) */}
      {isHost && (
        <>
          {/* Categories */}
          <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏠</span>
              <h2 className="font-semibold text-sm uppercase text-muted">Categories</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    room?.categories.includes(cat)
                      ? 'bg-primary text-white'
                      : 'bg-background border border-card-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Imposters */}
          <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🕵️</span>
                <div>
                  <h2 className="font-semibold text-sm uppercase text-muted">Imposters</h2>
                  <p className="text-sm">{room?.imposter_count} Imposter{(room?.imposter_count || 1) > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const count = Math.max(1, (room?.imposter_count || 1) - 1);
                    setRoom(room ? { ...room, imposter_count: count } : null);
                    updateSettings({ imposter_count: count });
                  }}
                  className="w-8 h-8 rounded-full bg-background border border-card-border flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-mono font-bold w-4 text-center">{room?.imposter_count}</span>
                <button
                  onClick={() => {
                    const maxImposters = Math.max(1, Math.floor(players.length / 2) - 1);
                    const count = Math.min(maxImposters, (room?.imposter_count || 1) + 1);
                    setRoom(room ? { ...room, imposter_count: count } : null);
                    updateSettings({ imposter_count: count });
                  }}
                  className="w-8 h-8 rounded-full bg-background border border-card-border flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Time Limit */}
          <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                <div>
                  <h2 className="font-semibold text-sm uppercase text-muted">Time Limit</h2>
                  <p className="text-sm">{room?.time_limit ? `${room.time_limit}s` : 'Disabled'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const limits = [null, 30, 60, 90, 120, 180];
                  const currentIdx = limits.indexOf(room?.time_limit ?? null);
                  const nextIdx = (currentIdx + 1) % limits.length;
                  const newLimit = limits[nextIdx];
                  setRoom(room ? { ...room, time_limit: newLimit } : null);
                  updateSettings({ time_limit: newLimit });
                }}
                className="px-3 py-1.5 rounded-xl text-sm bg-background border border-card-border"
              >
                Change
              </button>
            </div>
          </div>

          {/* Imposter Hint */}
          <div className="bg-card border border-card-border rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <div>
                <h2 className="font-semibold text-sm uppercase text-muted">Imposter Hint</h2>
                <p className="text-sm text-muted">Help imposters blend in</p>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'none', label: 'No Hint' },
                { value: 'category', label: 'Category' },
                { value: 'word', label: 'Clue Word' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setRoom(room ? { ...room, hint_type: opt.value as Room['hint_type'] } : null);
                    updateSettings({ hint_type: opt.value });
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    room?.hint_type === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-background border border-card-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">
              {room?.hint_type === 'none' && 'Imposters get no help — hard mode!'}
              {room?.hint_type === 'category' && 'Imposters see which category the word is from'}
              {room?.hint_type === 'word' && 'Imposters get a related clue word to help them bluff'}
            </p>
          </div>
        </>
      )}

      {/* Non-host sees read-only settings */}
      {!isHost && room && (
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-6 space-y-2">
          <p className="text-sm text-muted">
            <strong>Categories:</strong> {room.categories.join(', ')}
          </p>
          <p className="text-sm text-muted">
            <strong>Imposters:</strong> {room.imposter_count}
          </p>
          <p className="text-sm text-muted">
            <strong>Time Limit:</strong> {room.time_limit ? `${room.time_limit}s` : 'None'}
          </p>
          <p className="text-sm text-muted">
            <strong>Hint:</strong> {room.hint_type === 'none' ? 'None' : room.hint_type === 'category' ? 'Category' : 'Clue Word'}
          </p>
          <p className="text-center text-sm text-muted mt-4">Waiting for host to start the game...</p>
        </div>
      )}

      {/* Start button (host only) */}
      {isHost && (
        <div className="mt-auto pt-4">
          {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
          <button
            onClick={startGame}
            disabled={starting || players.length < 3}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/20 text-lg flex items-center justify-center gap-2"
          >
            {starting ? (
              'Starting...'
            ) : (
              <>
                ▶ Start Game
                {players.length < 3 && (
                  <span className="text-sm font-normal opacity-80">
                    (need {3 - players.length} more)
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
