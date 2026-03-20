export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'voting' | 'results';
  categories: string[];
  imposter_count: number;
  time_limit: number | null;
  hint_type: 'none' | 'category' | 'word';
  word: string | null;
  hint_text: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  is_imposter: boolean;
  vote_for: string | null;
  joined_at: string;
}

export interface GameRole {
  role: 'player' | 'imposter';
  word?: string;
  hint?: string;
  hintType?: 'none' | 'category' | 'word';
}

export type GameStatus = Room['status'];

export const CATEGORIES = [
  'Everyday Objects',
  'Famous People',
  'Foods & Drinks',
  'Animals',
  'Places',
  'Movies & TV Shows',
] as const;

export type Category = (typeof CATEGORIES)[number];
