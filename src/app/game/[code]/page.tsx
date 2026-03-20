'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import type { Room, Player, GameRole } from '@/lib/types';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [role, setRole] = useState<GameRole | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [results, setResults] = useState<{
    word: string;
    players: (Player & { is_imposter: boolean })[];
    voteCounts: Record<string, number>;
    voterMap: Record<string, string[]>;
    impostersCaught: boolean;
    imposterId: string[];
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isHost = room?.host_id === playerId;

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data.room);
    setPlayers(data.players);
    setLoading(false);
    if (data.room.status === 'waiting') {
      router.push(`/lobby/${code}`);
    }
  }, [code, router]);

  const fetchRole = useCallback(async () => {
    const id = localStorage.getItem('imposter_player_id') || '';
    const res = await fetch(`/api/rooms/${code}/role?playerId=${id}`);
    if (res.ok) {
      const data = await res.json();
      setRole(data);
    }
  }, [code]);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}/results`);
    if (res.ok) {
      const data = await res.json();
      setResults(data);
    }
  }, [code]);

  useEffect(() => {
    const id = localStorage.getItem('imposter_player_id') || '';
    setPlayerId(id);
    fetchRoom();
  }, [fetchRoom]);

  // Fetch role when game is playing
  useEffect(() => {
    if (room?.status === 'playing' || room?.status === 'voting') {
      fetchRole();
    }
    if (room?.status === 'results') {
      fetchResults();
    }
  }, [room?.status, fetchRole, fetchResults]);

  // Timer
  useEffect(() => {
    if (room?.status === 'playing' && room.time_limit) {
      setTimeLeft(room.time_limit);
    } else {
      setTimeLeft(null);
    }
  }, [room?.status, room?.time_limit]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-trigger voting when timer expires (host only)
          if (isHost && room?.status === 'playing') {
            fetch(`/api/rooms/${code}/voting`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerId }),
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isHost, room?.status, code, playerId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!room?.id) return;
    const currentRoomId = room.id;

    const sb = getSupabase();
    const channel = sb
      .channel(`game-${currentRoomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoomId}` },
        (payload) => {
          const updated = payload.new as Room;
          setRoom(updated);
          if (updated.status === 'waiting') {
            router.push(`/lobby/${code}`);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${currentRoomId}` },
        () => {
          fetchRoom();
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(fetchRoom, 3000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  async function startVoting() {
    await fetch(`/api/rooms/${code}/voting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
  }

  async function submitVote(targetId: string) {
    setVotedFor(targetId);
    await fetch(`/api/rooms/${code}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, voteFor: targetId }),
    });
  }

  async function backToLobby() {
    await fetch(`/api/rooms/${code}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, action: 'lobby' }),
    });
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-500">Room not found</p>
        <button onClick={() => router.push('/')} className="text-primary font-medium">
          Go Home
        </button>
      </div>
    );
  }

  // PLAYING PHASE - Word reveal + discussion
  if (room.status === 'playing') {
    return (
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        {/* Timer */}
        {timeLeft !== null && (
          <div className="text-center mb-4">
            <div
              className={`inline-block text-3xl font-mono font-bold px-6 py-2 rounded-2xl ${
                timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse-slow' : 'bg-card border border-card-border'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {/* Role reveal card */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="bg-card border-2 border-dashed border-card-border rounded-3xl p-12 text-center animate-pulse-slow"
            >
              <div className="text-5xl mb-4">🔒</div>
              <p className="text-lg font-semibold">Tap to reveal your role</p>
              <p className="text-sm text-muted mt-1">Make sure no one else can see your screen!</p>
            </button>
          ) : (
            <div className="animate-fade-in text-center space-y-6">
              {role?.role === 'imposter' ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8">
                  <div className="text-5xl mb-3">🕵️</div>
                  <h2 className="text-2xl font-bold text-red-600">You are the Imposter!</h2>
                  <p className="text-muted mt-2">Try to blend in without knowing the word</p>
                  {role.hint && (
                    <div className="mt-4 bg-white rounded-xl p-3 border border-red-100">
                      <p className="text-sm text-muted">
                        {role.hintType === 'category' ? '📂 Category' : '💡 Clue Word'}
                      </p>
                      <p className="font-medium text-lg">{role.hint}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8">
                  <div className="text-5xl mb-3">✅</div>
                  <h2 className="text-lg font-medium text-green-700">The secret word is:</h2>
                  <p className="text-4xl font-bold mt-2">{role?.word}</p>
                </div>
              )}

              <button
                onClick={() => setRevealed(false)}
                className="text-sm text-muted hover:text-foreground"
              >
                🔒 Hide my role
              </button>
            </div>
          )}
        </div>

        {/* Players in the game */}
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
          <p className="text-sm text-muted mb-2">Players in this round:</p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <span key={p.id} className="bg-background border border-card-border rounded-xl px-3 py-1 text-sm">
                {p.name} {p.id === playerId ? '(you)' : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Host controls */}
        {isHost && (
          <button
            onClick={startVoting}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/20 text-lg"
          >
            🗳️ Start Voting
          </button>
        )}
        {!isHost && (
          <p className="text-center text-sm text-muted py-4">
            Discuss with other players... the host will start voting when ready
          </p>
        )}
      </div>
    );
  }

  // VOTING PHASE
  if (room.status === 'voting') {
    const votedPlayers = players.filter((p) => p.vote_for !== null);

    return (
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🗳️</div>
          <h1 className="text-2xl font-bold">Vote for the Imposter</h1>
          <p className="text-sm text-muted mt-1">
            {votedPlayers.length}/{players.length} votes cast
          </p>
        </div>

        {votedFor ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-lg font-semibold">Vote submitted!</p>
            <p className="text-sm text-muted">Waiting for other players to vote...</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            <p className="text-sm text-muted text-center mb-4">
              Who do you think is the imposter?
            </p>
            {players
              .filter((p) => p.id !== playerId)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => submitVote(p.id)}
                  className="w-full bg-card hover:bg-card-border border border-card-border rounded-2xl p-4 text-left transition-all flex items-center justify-between"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-primary">Vote →</span>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  // RESULTS PHASE
  if (room.status === 'results' && results) {
    return (
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-6 animate-fade-in">
          <div className="text-5xl mb-3">{results.impostersCaught ? '🎉' : '😈'}</div>
          <h1 className="text-2xl font-bold">
            {results.impostersCaught ? 'Imposters Caught!' : 'Imposters Win!'}
          </h1>
          <p className="text-muted mt-1">The secret word was:</p>
          <p className="text-3xl font-bold mt-1">{results.word}</p>
        </div>

        {/* Imposter reveal */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 animate-fade-in">
          <h2 className="font-semibold text-sm uppercase text-red-500 mb-2">
            🕵️ The Imposter{results.imposterId.length > 1 ? 's' : ''}
          </h2>
          <div className="flex flex-wrap gap-2">
            {results.players
              .filter((p) => p.is_imposter)
              .map((p) => (
                <span key={p.id} className="bg-red-100 text-red-700 rounded-xl px-3 py-1.5 font-medium text-sm">
                  {p.name}
                </span>
              ))}
          </div>
        </div>

        {/* Vote breakdown */}
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-6 animate-fade-in">
          <h2 className="font-semibold text-sm uppercase text-muted mb-3">🗳️ Votes</h2>
          <div className="space-y-3">
            {results.players.map((p) => {
              const voteCount = results.voteCounts[p.id] || 0;
              const voters = results.voterMap[p.id] || [];
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${p.is_imposter ? 'text-red-600' : ''}`}>
                      {p.name}
                      {p.is_imposter && ' 🕵️'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                    {voters.length > 0 && (
                      <p className="text-xs text-muted">from {voters.join(', ')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {isHost && (
          <div className="mt-auto space-y-3">
            <button
              onClick={backToLobby}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/20 text-lg"
            >
              🔄 Play Again
            </button>
          </div>
        )}
        {!isHost && (
          <p className="text-center text-sm text-muted mt-auto py-4">
            Waiting for the host to start a new round...
          </p>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-muted">Loading game state...</div>
    </div>
  );
}
