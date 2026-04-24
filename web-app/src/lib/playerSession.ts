export type PlayerSession = {
  id: string;
  player_id?: string; // Optional alias for id
  name: string;
  klan_id: string;
  klan_name: string;
  klan_color: string;
  game_id: string;
};

const SESSION_KEY = 'peachgames_player_session';

export function getPlayerSession(): PlayerSession | null {
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data) as PlayerSession;
    // Ensure player_id is set (for compatibility)
    parsed.player_id = parsed.player_id || parsed.id;
    return parsed;
  } catch {
    return null;
  }
}

export function setPlayerSession(session: PlayerSession): void {
  // Ensure player_id is always set
  const sessionWithPlayerId = {
    ...session,
    player_id: session.player_id || session.id,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionWithPlayerId));
}

export function clearPlayerSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}