export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectImposters(playerIds: string[], count: number): string[] {
  const shuffled = shuffleArray(playerIds);
  return shuffled.slice(0, Math.min(count, playerIds.length - 1));
}

export function getVoteResults(players: { id: string; name: string; vote_for: string | null; is_imposter: boolean }[]) {
  const voteCounts: Record<string, number> = {};
  const voterMap: Record<string, string[]> = {};

  for (const player of players) {
    if (player.vote_for) {
      voteCounts[player.vote_for] = (voteCounts[player.vote_for] || 0) + 1;
      if (!voterMap[player.vote_for]) voterMap[player.vote_for] = [];
      const voterName = player.name;
      voterMap[player.vote_for].push(voterName);
    }
  }

  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const mostVoted = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  const imposters = players.filter((p) => p.is_imposter);
  const imposterId = imposters.map((p) => p.id);
  const caughtImposters = mostVoted.filter((id) => imposterId.includes(id));
  const impostersCaught = caughtImposters.length > 0;

  return { voteCounts, voterMap, mostVoted, impostersCaught, imposterId };
}
