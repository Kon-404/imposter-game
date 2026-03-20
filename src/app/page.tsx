'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('imposter_player_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('imposter_player_id', id);
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill join code from deep link (/join?code=XXXX)
  useEffect(() => {
    const savedCode = sessionStorage.getItem('imposter_join_code');
    if (savedCode) {
      setCode(savedCode);
      setMode('join');
      sessionStorage.removeItem('imposter_join_code');
    }
  }, []);

  async function handleHost() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const playerId = getPlayerId();
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      localStorage.setItem('imposter_player_name', name.trim());
      router.push(`/lobby/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!code.trim() || code.trim().length !== 4) {
      setError('Please enter a valid 4-letter room code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const playerId = getPlayerId();
      const res = await fetch(`/api/rooms/${code.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');
      localStorage.setItem('imposter_player_name', name.trim());
      router.push(`/lobby/${code.trim().toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🕵️</div>
          <h1 className="text-4xl font-bold tracking-tight">Imposter</h1>
          <p className="text-muted text-sm">The word guessing party game</p>
        </div>

        {/* Mode selection */}
        {mode === 'idle' && (
          <div className="space-y-3 animate-fade-in">
            <button
              onClick={() => setMode('host')}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              🎮 Host Game
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-card hover:bg-card-border border border-card-border font-semibold py-4 px-6 rounded-2xl transition-all active:scale-[0.98]"
            >
              🚪 Join Game
            </button>
          </div>
        )}

        {/* Host form */}
        {mode === 'host' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-lg">Host a New Game</h2>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full border border-card-border rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => e.key === 'Enter' && handleHost()}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleHost}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/20"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button
              onClick={() => { setMode('idle'); setError(''); }}
              className="w-full text-muted text-sm py-2"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-lg">Join a Game</h2>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full border border-card-border rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="text"
                placeholder="Room code (e.g. ABCD)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full border border-card-border rounded-xl px-4 py-3 bg-background text-center text-2xl font-mono tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/20"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button
              onClick={() => { setMode('idle'); setError(''); }}
              className="w-full text-muted text-sm py-2"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
